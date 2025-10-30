#!/usr/bin/env python3
"""
사용자 기능 권한 컬럼 추가 마이그레이션 스크립트
- service_report_lock: 서비스 리포트 잠금 버튼 권한
- transaction_excel_export: 거래명세표 엑셀 생성 버튼 권한
"""

import sqlite3
import sys
import os

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.init_db import get_db_connection

def add_function_permissions():
    """사용자 테이블에 기능 권한 컬럼 추가"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 기존 컬럼 확인
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [column[1] for column in cursor.fetchall()]

        print(f"현재 users 테이블의 컬럼: {existing_columns}")

        # service_report_lock 컬럼 추가 (기본값: 1 - 권한 있음)
        if 'service_report_lock' not in existing_columns:
            print("service_report_lock 컬럼 추가 중...")
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN service_report_lock INTEGER DEFAULT 1
            """)
            print("✓ service_report_lock 컬럼이 추가되었습니다.")
        else:
            print("service_report_lock 컬럼이 이미 존재합니다.")

        # transaction_excel_export 컬럼 추가 (기본값: 1 - 권한 있음)
        if 'transaction_excel_export' not in existing_columns:
            print("transaction_excel_export 컬럼 추가 중...")
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN transaction_excel_export INTEGER DEFAULT 1
            """)
            print("✓ transaction_excel_export 컬럼이 추가되었습니다.")
        else:
            print("transaction_excel_export 컬럼이 이미 존재합니다.")

        conn.commit()
        print("\n마이그레이션이 성공적으로 완료되었습니다!")

        # 업데이트된 컬럼 목록 확인
        cursor.execute("PRAGMA table_info(users)")
        updated_columns = [column[1] for column in cursor.fetchall()]
        print(f"\n업데이트된 users 테이블의 컬럼: {updated_columns}")

    except Exception as e:
        print(f"오류 발생: {str(e)}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("사용자 기능 권한 컬럼 추가 마이그레이션 시작")
    print("=" * 60)
    add_function_permissions()
    print("=" * 60)
