import sqlite3

conn = sqlite3.connect('app/database/user.db')

# 환율 및 팩터 설정 테이블 생성
conn.execute('''
    CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency_from TEXT NOT NULL,
        currency_to TEXT NOT NULL,
        rate REAL NOT NULL,
        factor REAL DEFAULT 1.0,
        effective_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(currency_from, currency_to, is_active)
    )
''')

# 기본 환율 및 팩터 데이터 삽입
today = "2025-10-05"

# 기존 데이터 삭제 후 재삽입
conn.execute('DELETE FROM exchange_rates')

# 기본 환율 설정 (예시)
exchange_data = [
    ('EUR', 'KRW', 1450.0, 1.3, today, 1),  # 유로 -> 원화, 팩터 1.3
    ('USD', 'KRW', 1340.0, 1.25, today, 1), # 달러 -> 원화, 팩터 1.25
    ('KRW', 'KRW', 1.0, 1.2, today, 1),     # 원화 -> 원화, 팩터 1.2
]

for data in exchange_data:
    conn.execute('''
        INSERT INTO exchange_rates 
        (currency_from, currency_to, rate, factor, effective_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', data)

conn.commit()
conn.close()

print("환율 및 팩터 설정 테이블이 생성되었습니다.")
print("기본 환율 데이터:")
print("- EUR -> KRW: 1450원 (팩터: 1.3)")
print("- USD -> KRW: 1340원 (팩터: 1.25)")
print("- KRW -> KRW: 1원 (팩터: 1.2)")