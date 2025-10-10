import sqlite3
import os

def check_margin_storage():
    """마진율 저장 방법 확인 및 수정"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. 현재 테이블 목록 확인
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("현재 테이블 목록:")
    for table in tables:
        print(f"  - {table[0]}")
    
    # 2. 설정 테이블이 있는지 확인
    if any('settings' in table[0].lower() for table in tables):
        print("\n설정 테이블 발견!")
        for table in tables:
            if 'settings' in table[0].lower():
                print(f"설정 테이블: {table[0]}")
                cursor.execute(f"PRAGMA table_info({table[0]})")
                columns = cursor.fetchall()
                print("컬럼 정보:")
                for col in columns:
                    print(f"  - {col[1]} ({col[2]})")
    else:
        print("\n설정 테이블이 없습니다. 새로 생성하겠습니다.")
        
        # 3. 설정 테이블 생성
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS spare_part_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        cursor.execute(create_table_sql)
        
        # 4. 기본 마진율 설정 추가
        cursor.execute("""
        INSERT OR REPLACE INTO spare_part_settings (setting_key, setting_value)
        VALUES ('margin_rate', '20')
        """)
        
        conn.commit()
        print("spare_part_settings 테이블을 생성하고 기본 마진율(20%)을 설정했습니다.")
    
    # 5. 현재 마진율 확인
    try:
        cursor.execute("SELECT setting_value FROM spare_part_settings WHERE setting_key = 'margin_rate'")
        result = cursor.fetchone()
        if result:
            print(f"\n현재 저장된 마진율: {result[0]}%")
        else:
            print("\n저장된 마진율이 없습니다.")
    except:
        print("\n마진율을 조회할 수 없습니다.")
    
    conn.close()

if __name__ == "__main__":
    check_margin_storage()