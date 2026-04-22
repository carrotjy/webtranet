"""
2025년 결산 스페어파트 데이터 임포트 스크립트
- 기존 spare_parts, stock_history, price_history 전체 삭제
- 2026 Spareparts.xlsx 파일의 데이터를 updated_at=2025-12-31로 삽입
- backend/ 디렉토리에서 실행: python import_spareparts_2025.py
"""

import sqlite3
import pandas as pd
import json
import os
import sys
from datetime import datetime

DB_PATH = os.path.join('app', 'database', 'user.db')
EXCEL_PATH = os.path.join('instance', '2026 Spareparts.xlsx')
IMPORT_DATE = '2025-12-31'
IMPORT_DATETIME = '2025-12-31 00:00:00'


def main():
    # 파일 존재 확인
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] DB 파일을 찾을 수 없습니다: {DB_PATH}")
        sys.exit(1)

    if not os.path.exists(EXCEL_PATH):
        print(f"[ERROR] 엑셀 파일을 찾을 수 없습니다: {EXCEL_PATH}")
        sys.exit(1)

    # 엑셀 읽기
    print(f"엑셀 파일 읽는 중: {EXCEL_PATH}")
    df = pd.read_excel(EXCEL_PATH, header=0)
    print(f"총 {len(df)}개 행 읽음")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # past_part_numbers 컬럼 없으면 추가 (마이그레이션)
        cur = conn.execute("PRAGMA table_info(spare_parts)")
        cols = [row[1] for row in cur.fetchall()]
        if 'past_part_numbers' not in cols:
            conn.execute("ALTER TABLE spare_parts ADD COLUMN past_part_numbers TEXT")
            print("past_part_numbers 컬럼 추가됨")

        # 삭제 전 현황 출력
        count_parts = conn.execute("SELECT COUNT(*) FROM spare_parts").fetchone()[0]
        count_stock = conn.execute("SELECT COUNT(*) FROM stock_history").fetchone()[0]
        count_price = conn.execute("SELECT COUNT(*) FROM price_history").fetchone()[0]
        print(f"\n삭제 전: spare_parts={count_parts}개, stock_history={count_stock}개, price_history={count_price}개")

        confirm = input("\n[WARNING] 기존 데이터를 모두 삭제하고 엑셀 데이터로 교체합니다. 계속하시겠습니까? (yes 입력): ")
        if confirm.strip().lower() != 'yes':
            print("취소됨.")
            conn.close()
            sys.exit(0)

        # 순서대로 삭제 (FK 제약)
        print("\n기존 데이터 삭제 중...")
        conn.execute("DELETE FROM price_history")
        conn.execute("DELETE FROM stock_history")
        conn.execute("DELETE FROM spare_parts")
        # auto-increment 시퀀스 초기화
        conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('spare_parts', 'price_history', 'stock_history')")
        conn.commit()
        print("기존 데이터 삭제 완료")

        # 데이터 삽입
        inserted = 0
        skipped = 0

        print("\n데이터 삽입 중...")
        for idx, row in df.iterrows():
            part_number = str(row['부품번호']).strip() if pd.notna(row['부품번호']) else None
            if not part_number or part_number == 'nan':
                skipped += 1
                continue

            erp_name = str(row['ERP명']).strip() if pd.notna(row['ERP명']) else ''
            # 부품명 없으면 ERP명으로 대체
            part_name_raw = str(row['부품명']).strip() if pd.notna(row['부품명']) else ''
            part_name = part_name_raw if part_name_raw and part_name_raw != 'nan' else erp_name

            price_eur = float(str(row['구매원가']).replace(',', '.')) if pd.notna(row['구매원가']) else 0.0
            price_krw = float(str(row['Price']).replace(',', '.')) if pd.notna(row['Price']) else 0.0
            stock_quantity = int(row['재고수량']) if pd.notna(row['재고수량']) else 0
            part_type_raw = str(row['부품 타입']).strip() if pd.notna(row['부품 타입']) else ''
            part_type_map = {
                '소모성 부품': 'consumable', '소모용 부품': 'consumable', '소모용': 'consumable',
                '수리용 부품': 'repair', '수리용': 'repair',
            }
            part_type = part_type_map.get(part_type_raw, part_type_raw)

            old_part_nr = str(row['구 파트번호']).strip() if pd.notna(row['구 파트번호']) else None
            past_numbers = [old_part_nr] if old_part_nr and old_part_nr != 'nan' else []
            past_numbers_json = json.dumps(past_numbers, ensure_ascii=False) if past_numbers else None

            # spare_parts 삽입
            conn.execute('''
                INSERT INTO spare_parts
                (part_number, part_name, erp_name, price, stock_quantity, minimum_stock,
                 past_part_numbers, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
            ''', (
                part_number, part_name, erp_name, price_eur, stock_quantity,
                past_numbers_json, IMPORT_DATETIME, IMPORT_DATETIME
            ))

            # 방금 삽입된 id 조회
            part_id = conn.execute(
                'SELECT id FROM spare_parts WHERE part_number = ?', (part_number,)
            ).fetchone()['id']

            # price_history 삽입 (EUR 구매원가 + KRW 청구가)
            conn.execute('''
                INSERT INTO price_history
                (spare_part_id, price, billing_price, effective_date, currency, part_type, created_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                part_id, price_eur, price_krw, IMPORT_DATE, 'EUR', part_type,
                datetime.now().isoformat(), 'import_2025'
            ))

            # stock_history 삽입 (2025-12-31 이월 입고)
            if stock_quantity > 0:
                conn.execute('''
                    INSERT INTO stock_history
                    (part_number, transaction_type, quantity, previous_stock, new_stock,
                     transaction_date, notes, created_at, created_by)
                    VALUES (?, 'IN', ?, 0, ?, ?, ?, ?, ?)
                ''', (
                    part_number, stock_quantity, stock_quantity,
                    IMPORT_DATE, '2025년 결산 이월',
                    datetime.now().isoformat(), 'import_2025'
                ))

            inserted += 1

            if inserted % 50 == 0:
                print(f"  {inserted}개 삽입 중...")

        conn.commit()
        print(f"\n[OK] 임포트 완료: {inserted}개 삽입, {skipped}개 스킵 (부품번호 없음)")

        # 최종 현황
        count_parts = conn.execute("SELECT COUNT(*) FROM spare_parts").fetchone()[0]
        count_price = conn.execute("SELECT COUNT(*) FROM price_history").fetchone()[0]
        count_stock = conn.execute("SELECT COUNT(*) FROM stock_history").fetchone()[0]
        print(f"최종: spare_parts={count_parts}개, price_history={count_price}개, stock_history={count_stock}개")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
