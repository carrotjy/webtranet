import sqlite3

conn = sqlite3.connect('app/database/user.db')

# 기존 price_history 테이블 삭제
conn.execute('DROP TABLE IF EXISTS price_history')

# 새로운 price_history 테이블 생성
conn.execute('''
    CREATE TABLE price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spare_part_id INTEGER NOT NULL,
        price REAL NOT NULL,
        effective_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        FOREIGN KEY (spare_part_id) REFERENCES spare_parts (id) ON DELETE CASCADE
    )
''')

conn.commit()
conn.close()

print("price_history 테이블이 업데이트되었습니다.")