"""
스페어파트 테이블에 ERP명 컬럼 추가 스크립트
"""
import sqlite3
import os

def add_erp_name_column():
    # 데이터베이스 파일 경로
    db_path = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')
    
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # spare_parts 테이블에 erp_name 컬럼이 이미 있는지 확인
        cursor.execute("PRAGMA table_info(spare_parts)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'erp_name' not in columns:
            # erp_name 컬럼 추가
            cursor.execute("ALTER TABLE spare_parts ADD COLUMN erp_name TEXT")
            print("✅ spare_parts 테이블에 erp_name 컬럼이 성공적으로 추가되었습니다.")
        else:
            print("ℹ️ spare_parts 테이블에 erp_name 컬럼이 이미 존재합니다.")
        
        # 변경사항 저장
        conn.commit()
        
    except sqlite3.Error as e:
        print(f"❌ 데이터베이스 오류: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_erp_name_column()