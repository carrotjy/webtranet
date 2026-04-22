"""
임포트된 스페어파트 청구가 재계산 스크립트
- part_type 한글 → 영문 변환 (소모성 부품 → consumable, 수리용 부품 → repair)
- EUR 원가 기준으로 환율 + 2차함수 팩터 적용하여 billing_price 재계산
- spare_parts.price 도 업데이트
- backend/ 디렉토리에서 실행: python recalculate_billing_price.py
"""

import sqlite3
import math
import os
import sys
from datetime import datetime

DB_PATH = os.path.join('app', 'database', 'user.db')

# 엑셀 한글 부품 타입 → DB 영문 변환
PART_TYPE_MAP = {
    '소모성 부품': 'consumable',
    '소모용 부품': 'consumable',
    '소모용': 'consumable',
    '수리용 부품': 'repair',
    '수리용': 'repair',
    'consumable': 'consumable',
    'repair': 'repair',
}


def get_factor_info(conn, part_type):
    row = conn.execute(
        '''SELECT factor_a, factor_b, factor_c, min_price, max_price, min_factor, max_factor
           FROM pricing_factors
           WHERE part_type = ? AND currency = "KRW"''',
        (part_type,)
    ).fetchone()

    if row:
        return dict(row)

    # DB에 없으면 기본값 사용
    if part_type == 'repair':
        return {'factor_a': 0.0000001, 'factor_b': -0.000615608, 'factor_c': 2.149275123,
                'min_price': 100, 'max_price': 10000, 'min_factor': 1.20, 'max_factor': 2.10}
    else:  # consumable
        return {'factor_a': 0.0000001, 'factor_b': -0.0003, 'factor_c': 1.6,
                'min_price': 100, 'max_price': 10000, 'min_factor': 1.20, 'max_factor': 1.55}


def calculate_billing_price(price_eur, exchange_rate, part_type, factor_info):
    krw_cost = price_eur * exchange_rate

    a = factor_info['factor_a']
    b = factor_info['factor_b']
    c = factor_info['factor_c']
    min_price = factor_info['min_price']
    max_price = factor_info['max_price']
    min_factor = factor_info['min_factor'] or 1.20
    max_factor = factor_info['max_factor'] or (2.10 if part_type == 'repair' else 1.55)

    if price_eur < min_price:
        final_krw = krw_cost * max_factor
    elif price_eur > max_price:
        final_krw = krw_cost * min_factor
    else:
        factor = a * (price_eur ** 2) + b * price_eur + c
        final_krw = krw_cost * factor

    final_krw = max(krw_cost, final_krw)
    return math.ceil(final_krw / 100) * 100  # 100원 단위 올림


def main():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] DB 파일 없음: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # EUR → KRW 환율 조회
    rate_row = conn.execute(
        '''SELECT rate FROM exchange_rates
           WHERE currency_from = "EUR" AND currency_to = "KRW" AND is_active = 1'''
    ).fetchone()

    if not rate_row:
        print("[ERROR] EUR→KRW 환율 정보가 DB에 없습니다. 관리자 설정에서 환율을 먼저 입력해주세요.")
        conn.close()
        sys.exit(1)

    exchange_rate = rate_row['rate']
    print(f"EUR→KRW 환율: {exchange_rate}")

    # import_2025로 입력된 price_history 전체 조회
    rows = conn.execute(
        '''SELECT ph.id, ph.spare_part_id, ph.price, ph.part_type, sp.part_number
           FROM price_history ph
           JOIN spare_parts sp ON ph.spare_part_id = sp.id
           WHERE ph.created_by = "import_2025"'''
    ).fetchall()

    print(f"\n대상: {len(rows)}개 부품")

    updated = 0
    skipped = 0
    type_converted = {'consumable': 0, 'repair': 0}

    for row in rows:
        raw_type = row['part_type'] or ''
        part_type = PART_TYPE_MAP.get(raw_type, None)

        if not part_type:
            print(f"  [SKIP] {row['part_number']}: 알 수 없는 부품 타입 '{raw_type}'")
            skipped += 1
            continue

        price_eur = row['price']
        if not price_eur or price_eur <= 0:
            skipped += 1
            continue

        factor_info = get_factor_info(conn, part_type)
        billing_price = calculate_billing_price(price_eur, exchange_rate, part_type, factor_info)

        # price_history 업데이트
        conn.execute(
            '''UPDATE price_history
               SET part_type = ?, billing_price = ?, exchange_rate = ?
               WHERE id = ?''',
            (part_type, billing_price, exchange_rate, row['id'])
        )

        # spare_parts.price 업데이트 (최신 청구가)
        conn.execute(
            'UPDATE spare_parts SET price = ? WHERE id = ?',
            (billing_price, row['spare_part_id'])
        )

        type_converted[part_type] = type_converted.get(part_type, 0) + 1
        updated += 1

    conn.commit()
    conn.close()

    print(f"\n[OK] 재계산 완료: {updated}개 업데이트, {skipped}개 스킵")
    print(f"  - consumable(소모용): {type_converted.get('consumable', 0)}개")
    print(f"  - repair(수리용): {type_converted.get('repair', 0)}개")
    print(f"  - EUR→KRW 환율 {exchange_rate} 적용")


if __name__ == '__main__':
    main()
