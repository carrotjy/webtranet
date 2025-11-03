import sqlite3
import os

# 실제 사용되는 데이터베이스 경로
db_path = os.path.join('app', 'database', 'user.db')

if not os.path.exists(db_path):
    print(f"데이터베이스 파일을 찾을 수 없습니다: {db_path}")
    exit(1)

print(f"데이터베이스: {db_path}")

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

# 테이블 목록 확인
print("\n테이블 목록:")
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for table in tables:
    print(f"  - {table[0]}")

# stock_history 테이블 존재 확인
if any(t[0] == 'stock_history' for t in tables):
    cursor = conn.execute('''
        SELECT id, part_number, transaction_type, customer_name, reference_number, notes, created_by 
        FROM stock_history 
        WHERE notes LIKE '%거래명세서%' 
        ORDER BY id DESC 
        LIMIT 5
    ''')
    
    rows = cursor.fetchall()
    
    print('\n최근 명세서 관련 출고 기록:')
    print('-' * 100)
    if rows:
        for row in rows:
            print(f'ID: {row["id"]}, Part: {row["part_number"]}, Type: {row["transaction_type"]}')
            print(f'  customer_name: [{row["customer_name"]}]')
            print(f'  reference_number: [{row["reference_number"]}]')
            print(f'  notes: {row["notes"]}')
            print(f'  created_by: {row["created_by"]}')
            print('-' * 100)
    else:
        print("거래명세서 관련 출고 기록이 없습니다.")
else:
    print("\nstock_history 테이블이 존재하지 않습니다.")

conn.close()
