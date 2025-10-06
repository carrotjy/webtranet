#!/usr/bin/env python3
"""
기존 가격 이력에 billing_price 계산하여 업데이트
"""

import sqlite3
import os
import sys
from datetime import datetime

# 프로젝트 루트 경로 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.init_db import get_db_connection

def calculate_billing_price(price, currency, part_type):
    """청구가 계산 함수"""
    
    # 환율 정보
    exchange_rates = {'EUR': 1450, 'USD': 1300, 'KRW': 1}
    
    # 원화로 변환
    krw_cost_price = price * exchange_rates.get(currency, 1)
    
    # 통화별 팩터 계산 로직
    if currency == 'KRW':
        # KRW 원가는 최소/최대가격 상관없이 마진율만 적용
        margin_rate = 1.20  # 기본 마진율 20%
        final_price_krw = krw_cost_price * margin_rate
    else:
        # EUR/USD 원가는 EUR/USD 기준으로 최소/최대가격 비교해서 팩터 계산
        
        # 2차 함수 계수 (부품 타입별)
        if part_type == 'repair':
            a = 0.0000001
            b = -0.000615608
            c = 2.149275123
            min_price = 100  # EUR/USD 기준
            max_price = 3000
            min_factor = 1.20
            max_factor = 2.10
        else:  # consumable
            a = 0.0000001
            b = -0.0003
            c = 1.6
            min_price = 5
            max_price = 300
            min_factor = 1.20
            max_factor = 1.55
        
        # EUR/USD 기준 최소/최대가격과 비교
        if price < min_price:
            # 최소 가격 미만일 때 최대 팩터 적용
            final_price_krw = krw_cost_price * max_factor
        elif price > max_price:
            # 최대 가격 초과일 때 최소 팩터 적용
            final_price_krw = krw_cost_price * min_factor
        else:
            # 정상 범위일 때 2차 함수 적용 (EUR/USD 가격 기준)
            factor = a * (price ** 2) + b * price + c
            final_price_krw = krw_cost_price * factor
    
    # 최종 가격이 음수가 되지 않도록 보정
    final_price_krw = max(krw_cost_price, final_price_krw)
    
    # 100원 단위에서 올림 처리
    import math
    rounded_billing_price = math.ceil(final_price_krw / 100) * 100
    
    return rounded_billing_price

def update_existing_billing_prices():
    """기존 가격 이력에 billing_price 업데이트"""
    
    conn = get_db_connection()
    
    try:
        # billing_price가 0이거나 NULL인 가격 이력 조회
        price_histories = conn.execute('''
            SELECT id, price, currency, part_type 
            FROM price_history 
            WHERE billing_price IS NULL OR billing_price = 0
        ''').fetchall()
        
        print(f"업데이트할 가격 이력: {len(price_histories)}개")
        
        updated_count = 0
        for history in price_histories:
            history_id = history['id']
            price = history['price']
            currency = history['currency'] or 'KRW'
            part_type = history['part_type'] or 'repair'
            
            # 청구가 계산
            billing_price = calculate_billing_price(price, currency, part_type)
            
            # 업데이트
            conn.execute('''
                UPDATE price_history 
                SET billing_price = ? 
                WHERE id = ?
            ''', (billing_price, history_id))
            
            updated_count += 1
            print(f"ID {history_id}: {price} {currency} → {billing_price:,.0f} KRW")
        
        conn.commit()
        print(f"\n총 {updated_count}개의 가격 이력 billing_price 업데이트 완료!")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    update_existing_billing_prices()