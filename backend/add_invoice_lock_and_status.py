#!/usr/bin/env python3
"""
거래명세서(invoices) 테이블에 잠금 및 계산서 발행 상태 컬럼 추가
"""
import sqlite3
import sys
import os

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.init_db import get_db_connection

def add_columns():
    """invoices 테이블에 컬럼 추가"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. is_locked 컬럼 추가 (잠금 여부, 기본값 0)
        try:
            cursor.execute('''
                ALTER TABLE invoices ADD COLUMN is_locked INTEGER DEFAULT 0
            ''')
            print("✓ is_locked 컬럼이 추가되었습니다.")
        except sqlite3.OperationalError as e:
            if 'duplicate column' in str(e).lower():
                print("- is_locked 컬럼이 이미 존재합니다.")
            else:
                raise

        # 2. locked_by 컬럼 추가 (잠금 처리한 사용자 ID)
        try:
            cursor.execute('''
                ALTER TABLE invoices ADD COLUMN locked_by INTEGER
            ''')
            print("✓ locked_by 컬럼이 추가되었습니다.")
        except sqlite3.OperationalError as e:
            if 'duplicate column' in str(e).lower():
                print("- locked_by 컬럼이 이미 존재합니다.")
            else:
                raise

        # 3. locked_at 컬럼 추가 (잠금 처리 시각)
        try:
            cursor.execute('''
                ALTER TABLE invoices ADD COLUMN locked_at TEXT
            ''')
            print("✓ locked_at 컬럼이 추가되었습니다.")
        except sqlite3.OperationalError as e:
            if 'duplicate column' in str(e).lower():
                print("- locked_at 컬럼이 이미 존재합니다.")
            else:
                raise

        # 4. bill_status 컬럼 추가 (계산서 발행 상태: 'pending'=미발행, 'issued'=발행완료)
        try:
            cursor.execute('''
                ALTER TABLE invoices ADD COLUMN bill_status TEXT DEFAULT 'pending'
            ''')
            print("✓ bill_status 컬럼이 추가되었습니다.")
        except sqlite3.OperationalError as e:
            if 'duplicate column' in str(e).lower():
                print("- bill_status 컬럼이 이미 존재합니다.")
            else:
                raise

        # 5. bill_issued_at 컬럼 추가 (계산서 발행 시각)
        try:
            cursor.execute('''
                ALTER TABLE invoices ADD COLUMN bill_issued_at TEXT
            ''')
            print("✓ bill_issued_at 컬럼이 추가되었습니다.")
        except sqlite3.OperationalError as e:
            if 'duplicate column' in str(e).lower():
                print("- bill_issued_at 컬럼이 이미 존재합니다.")
            else:
                raise

        # 6. bill_issued_by 컬럼 추가 (계산서 발행 처리한 사용자 ID)
        try:
            cursor.execute('''
                ALTER TABLE invoices ADD COLUMN bill_issued_by INTEGER
            ''')
            print("✓ bill_issued_by 컬럼이 추가되었습니다.")
        except sqlite3.OperationalError as e:
            if 'duplicate column' in str(e).lower():
                print("- bill_issued_by 컬럼이 이미 존재합니다.")
            else:
                raise

        conn.commit()
        print("\n모든 컬럼이 성공적으로 추가되었습니다.")

    except Exception as e:
        conn.rollback()
        print(f"\n오류 발생: {e}")
        raise
    finally:
        conn.close()

def add_user_permissions():
    """users 테이블에 거래명세서 잠금 권한 컬럼 추가"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # transaction_lock 컬럼 추가 (거래명세서 잠금/해제 권한, 기본값 1=true)
        try:
            cursor.execute('''
                ALTER TABLE users ADD COLUMN transaction_lock INTEGER DEFAULT 1
            ''')
            print("✓ transaction_lock 컬럼이 users 테이블에 추가되었습니다.")
        except sqlite3.OperationalError as e:
            if 'duplicate column' in str(e).lower():
                print("- transaction_lock 컬럼이 이미 존재합니다.")
            else:
                raise

        conn.commit()
        print("\n사용자 권한 컬럼이 성공적으로 추가되었습니다.")

    except Exception as e:
        conn.rollback()
        print(f"\n오류 발생: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    print("=" * 60)
    print("거래명세서 잠금 및 계산서 발행 상태 컬럼 추가 스크립트")
    print("=" * 60)
    print()

    add_columns()
    print()
    add_user_permissions()

    print("\n" + "=" * 60)
    print("마이그레이션 완료!")
    print("=" * 60)
