import sqlite3

conn = sqlite3.connect('app/database/user.db')
cursor = conn.cursor()

print('Resources table schema:')
cursor.execute('PRAGMA table_info(resources)')
for row in cursor.fetchall():
    print(row)

print('\nSample data from resources table:')
cursor.execute('SELECT * FROM resources LIMIT 3')
for row in cursor.fetchall():
    print(row)

conn.close()