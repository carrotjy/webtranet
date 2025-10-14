#!/usr/bin/env python3
"""
새로운 권한 필드들을 users 테이블에 추가하는 스크립트
"""

import sqlite3
import os

def add_new_permissions():
    # 데이터베이스 파일 경로
    db_path = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 새로운 컬럼들 추가
        new_columns = [
            # 리소스 접근 권한
            "ALTER TABLE users ADD COLUMN resource_access INTEGER DEFAULT 0",
            
            # 거래명세서 CRUD 권한
            "ALTER TABLE users ADD COLUMN transaction_create INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN transaction_read INTEGER DEFAULT 0", 
            "ALTER TABLE users ADD COLUMN transaction_update INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN transaction_delete INTEGER DEFAULT 0",
            
            # 부품 CRUD 권한
            "ALTER TABLE users ADD COLUMN spare_parts_create INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN spare_parts_read INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN spare_parts_update INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN spare_parts_delete_crud INTEGER DEFAULT 0"
        ]
        
        for sql in new_columns:
            try:
                cursor.execute(sql)
                column_name = sql.split()[-3]  # 컬럼명 추출
                print(f"✅ 컬럼 추가 성공: {column_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    column_name = sql.split()[-3]
                    print(f"⚠️  컬럼이 이미 존재함: {column_name}")
                else:
                    print(f"❌ 컬럼 추가 실패: {e}")
        
        # 관리자 계정에 모든 권한 부여
        cursor.execute("""
            UPDATE users SET 
                resource_access = 1,
                transaction_create = 1,
                transaction_read = 1,
                transaction_update = 1,
                transaction_delete = 1,
                spare_parts_create = 1,
                spare_parts_read = 1,
                spare_parts_update = 1,
                spare_parts_delete_crud = 1
            WHERE is_admin = 1
        """)
        
        conn.commit()
        print("✅ 관리자 계정에 새로운 권한들이 부여되었습니다.")
        
        # 테이블 구조 확인
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        
        print("\n📋 현재 users 테이블 구조:")
        for column in columns:
            print(f"  - {column[1]} ({column[2]})")
        
        conn.close()
        print("\n🎉 데이터베이스 업데이트가 완료되었습니다!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    add_new_permissions()