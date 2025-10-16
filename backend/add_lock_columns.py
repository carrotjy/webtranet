import sqlite3
import os
import sys

# UTF-8 인코딩 설정
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# 데이터베이스 경로
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')

def add_lock_columns():
    """service_reports 테이블에 잠금 관련 컬럼 추가"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    try:
        # is_locked 컬럼 추가
        cursor.execute('ALTER TABLE service_reports ADD COLUMN is_locked BOOLEAN DEFAULT 0')
        print("[OK] is_locked column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[SKIP] is_locked column already exists")
        else:
            print(f"[ERROR] Failed to add is_locked column: {e}")

    try:
        # locked_by 컬럼 추가
        cursor.execute('ALTER TABLE service_reports ADD COLUMN locked_by INTEGER')
        print("[OK] locked_by column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[SKIP] locked_by column already exists")
        else:
            print(f"[ERROR] Failed to add locked_by column: {e}")

    try:
        # locked_at 컬럼 추가
        cursor.execute('ALTER TABLE service_reports ADD COLUMN locked_at TIMESTAMP')
        print("[OK] locked_at column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[SKIP] locked_at column already exists")
        else:
            print(f"[ERROR] Failed to add locked_at column: {e}")

    conn.commit()
    conn.close()
    print("\nMigration completed!")

if __name__ == '__main__':
    add_lock_columns()
