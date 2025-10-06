#!/usr/bin/env python3
"""
Update stock_history table to add customer_name and reference_number columns
"""

import sqlite3
import os

def update_stock_history_table():
    """stock_history 테이블에 customer_name과 reference_number 컬럼 추가"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    
    try:
        # Check if columns already exist
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(stock_history)")
        columns = [row[1] for row in cursor.fetchall()]
        
        print("현재 stock_history 테이블 컬럼:", columns)
        
        # Add customer_name column if it doesn't exist
        if 'customer_name' not in columns:
            print("customer_name 컬럼 추가 중...")
            conn.execute('ALTER TABLE stock_history ADD COLUMN customer_name VARCHAR(200)')
            print("customer_name 컬럼이 추가되었습니다.")
        else:
            print("customer_name 컬럼이 이미 존재합니다.")
        
        # Add reference_number column if it doesn't exist
        if 'reference_number' not in columns:
            print("reference_number 컬럼 추가 중...")
            conn.execute('ALTER TABLE stock_history ADD COLUMN reference_number VARCHAR(100)')
            print("reference_number 컬럼이 추가되었습니다.")
        else:
            print("reference_number 컬럼이 이미 존재합니다.")
        
        conn.commit()
        
        # Verify the update
        cursor.execute("PRAGMA table_info(stock_history)")
        updated_columns = [row[1] for row in cursor.fetchall()]
        print("업데이트된 stock_history 테이블 컬럼:", updated_columns)
        
    except Exception as e:
        print(f"오류 발생: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    update_stock_history_table()