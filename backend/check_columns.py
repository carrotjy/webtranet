import sqlite3

conn = sqlite3.connect('app/database/user.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(users)')
rows = cursor.fetchall()

print(f"Total columns: {len(rows)}")
print("Columns:")
for i, row in enumerate(rows):
    print(f"{i+1:2d}. {row[1]} ({row[2]})")

conn.close()