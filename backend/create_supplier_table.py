import sqlite3
import os

# 데이터베이스 경로
db_path = os.path.join('app', 'database', 'user.db')

# 데이터베이스 연결
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# supplier_info 테이블 생성
cursor.execute('''
CREATE TABLE IF NOT EXISTS supplier_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT,
    registration_number TEXT,
    ceo_name TEXT,
    address TEXT,
    phone TEXT,
    fax TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

conn.commit()
conn.close()

print('supplier_info 테이블이 성공적으로 생성되었습니다.')
