#!/usr/bin/env python3
"""
invoice_access 컬럼을 users 테이블에 추가하는 스크립트
"""

import sqlite3
import os

def add_invoice_access():
    # 데이터베이스 파일 경로
    db_path = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # invoice_access 컬럼 추가
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN invoice_access INTEGER DEFAULT 0")
            print("✅ invoice_access 컬럼 추가 성공")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("⚠️  invoice_access 컬럼이 이미 존재함")
            else:
                print(f"❌ 컬럼 추가 실패: {e}")
        
        # 관리자 계정에 invoice_access 권한 부여
        cursor.execute("""
            UPDATE users SET 
                invoice_access = 1
            WHERE is_admin = 1
        """)
        
        conn.commit()
        print("✅ 관리자 계정에 invoice_access 권한이 부여되었습니다.")
        
        # 테이블 구조 확인
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        
        print("\n📋 현재 users 테이블의 접근 권한 컬럼들:")
        for column in columns:
            if 'access' in column[1]:
                print(f"  - {column[1]} ({column[2]})")
        
        conn.close()
        print("\n🎉 invoice_access 컬럼 추가가 완료되었습니다!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    add_invoice_access()