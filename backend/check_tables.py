import sqlite3

conn = sqlite3.connect('app/database/user.db')

print('테이블 목록:')
tables = conn.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall()
for table in tables:
    print(f"- {table[0]}")

print('\nspare_parts 테이블 구조:')
spare_parts_info = conn.execute('PRAGMA table_info(spare_parts)').fetchall()
for col in spare_parts_info:
    print(f"  {col[1]} {col[2]}")

print('\nprice_history 테이블 구조:')
try:
    price_history_info = conn.execute('PRAGMA table_info(price_history)').fetchall()
    for col in price_history_info:
        print(f"  {col[1]} {col[2]}")
except Exception as e:
    print(f"  오류: {e}")

conn.close()