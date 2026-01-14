#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사용자 소프트 삭제 컬럼 추가 마이그레이션"""
import sqlite3
import os
import sys

# UTF-8 출력 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 데이터베이스 경로 (실제 사용 중인 DB)
DB_PATH = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')

def migrate():
    """is_deleted, deleted_at 컬럼 추가"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # is_deleted 컬럼 추가
        print("Adding is_deleted column...")
        cursor.execute('ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT 0')
        print("✓ is_deleted column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ is_deleted column already exists")
        else:
            raise

    try:
        # deleted_at 컬럼 추가
        print("Adding deleted_at column...")
        cursor.execute('ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP')
        print("✓ deleted_at column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✓ deleted_at column already exists")
        else:
            raise

    conn.commit()
    conn.close()
    print("\n✅ Migration completed successfully!")

if __name__ == '__main__':
    migrate()
