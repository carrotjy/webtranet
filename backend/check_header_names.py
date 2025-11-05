#!/usr/bin/env python3
"""
invoice_items에서 헤더 행의 실제 item_name 값 확인
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute('''
    SELECT id, invoice_id, item_name, is_header, length(item_name) as name_length
    FROM invoice_items
    WHERE is_header = 1
    ORDER BY invoice_id
''')

print("헤더 행 상세 정보:")
print("-" * 100)
print(f"{'ID':<6} {'Invoice':<10} {'Name':<30} {'is_header':<12} {'Length':<8} {'Repr'}")
print("-" * 100)

for row in cursor.fetchall():
    item_id, invoice_id, item_name, is_header, name_length = row
    print(f"{item_id:<6} {invoice_id:<10} {item_name:<30} {is_header:<12} {name_length:<8} {repr(item_name)}")

conn.close()
