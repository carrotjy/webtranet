import sqlite3

conn = sqlite3.connect('app/database/user.db')

print('invoice_rates 테이블 구조:')
try:
    rates_info = conn.execute('PRAGMA table_info(invoice_rates)').fetchall()
    for col in rates_info:
        print(f"  {col[1]} {col[2]}")
    
    print('\ninvoice_rates 데이터:')
    rates_data = conn.execute('SELECT * FROM invoice_rates').fetchall()
    for row in rates_data:
        print(f"  {row}")
except Exception as e:
    print(f"오류: {e}")

conn.close()