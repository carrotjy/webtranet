import sqlite3

conn = sqlite3.connect('app/database/user.db')

# price_history 테이블에 part_type 컬럼 추가
try:
    conn.execute('ALTER TABLE price_history ADD COLUMN part_type TEXT DEFAULT "repair"')
    print("price_history 테이블에 part_type 컬럼이 추가되었습니다.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("part_type 컬럼이 이미 존재합니다.")
    else:
        print(f"오류: {e}")

# 2차 함수 팩터 설정 테이블 생성
conn.execute('''
    CREATE TABLE IF NOT EXISTS pricing_factors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_type TEXT NOT NULL,
        currency TEXT NOT NULL,
        factor_a REAL NOT NULL DEFAULT 0,
        factor_b REAL NOT NULL DEFAULT 1,
        factor_c REAL NOT NULL DEFAULT 0,
        min_price REAL DEFAULT 0,
        max_price REAL DEFAULT 999999999,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(part_type, currency)
    )
''')

# 기본 팩터 데이터 삽입 (예시: factor = a*x^2 + b*x + c)
factors_data = [
    # 수리용 부품
    ('repair', 'KRW', 0.0000001, 1.2, 5000, 0, 999999999),  # y = 0.0000001x^2 + 1.2x + 5000
    ('repair', 'EUR', 0.0000001, 1.3, 100, 0, 999999999),   # y = 0.0000001x^2 + 1.3x + 100
    ('repair', 'USD', 0.0000001, 1.25, 80, 0, 999999999),   # y = 0.0000001x^2 + 1.25x + 80
    
    # 소모성 부품
    ('consumable', 'KRW', 0.0000005, 1.1, 3000, 0, 999999999),  # y = 0.0000005x^2 + 1.1x + 3000
    ('consumable', 'EUR', 0.0000005, 1.2, 50, 0, 999999999),    # y = 0.0000005x^2 + 1.2x + 50
    ('consumable', 'USD', 0.0000005, 1.15, 40, 0, 999999999),   # y = 0.0000005x^2 + 1.15x + 40
]

# 기존 데이터 삭제 후 재삽입
conn.execute('DELETE FROM pricing_factors')

for data in factors_data:
    conn.execute('''
        INSERT INTO pricing_factors 
        (part_type, currency, factor_a, factor_b, factor_c, min_price, max_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', data)

# 컬럼 확인
columns = conn.execute('PRAGMA table_info(price_history)').fetchall()
print("\nprice_history 테이블 구조:")
for col in columns:
    print(f"  {col[1]} {col[2]}")

print("\npricing_factors 테이블이 생성되었습니다.")
print("2차 함수 팩터 공식: 최종가격 = a×(원가)² + b×(원가) + c")
print("수리용 부품 (KRW): 0.0000001x² + 1.2x + 5000")
print("소모성 부품 (KRW): 0.0000005x² + 1.1x + 3000")

conn.commit()
conn.close()