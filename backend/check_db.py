import sqlite3
import os

db_path = os.path.join('app', 'database', 'user.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 테이블 목록 확인
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print('데이터베이스 테이블들:')
for table in tables:
    print(f'  - {table[0]}')

# stock_history 테이블 구조 확인
try:
    cursor.execute('PRAGMA table_info(stock_history)')
    columns = cursor.fetchall()
    print('\nstock_history 테이블 구조:')
    for col in columns:
        print(f'  - {col[1]} ({col[2]})')
    
    # 데이터 개수 확인
    cursor.execute('SELECT COUNT(*) FROM stock_history')
    count = cursor.fetchone()[0]
    print(f'\nstock_history 레코드 수: {count}')
    
    # 샘플 데이터 확인
    if count > 0:
        cursor.execute('SELECT * FROM stock_history ORDER BY created_at DESC LIMIT 3')
        rows = cursor.fetchall()
        print('\n최근 거래 내역:')
        for row in rows:
            print(f'  {row}')
            
except Exception as e:
    print(f'stock_history 테이블이 없습니다: {e}')

conn.close()