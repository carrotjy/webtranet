import sqlite3

conn = sqlite3.connect('app/database/user.db')

# pricing_factors 테이블에 min_factor, max_factor 컬럼 추가
try:
    conn.execute('ALTER TABLE pricing_factors ADD COLUMN min_factor REAL DEFAULT 1.20')
    print("pricing_factors 테이블에 min_factor 컬럼이 추가되었습니다.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("min_factor 컬럼이 이미 존재합니다.")
    else:
        print(f"오류: {e}")

try:
    conn.execute('ALTER TABLE pricing_factors ADD COLUMN max_factor REAL DEFAULT 2.10')
    print("pricing_factors 테이블에 max_factor 컬럼이 추가되었습니다.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("max_factor 컬럼이 이미 존재합니다.")
    else:
        print(f"오류: {e}")

# 기존 데이터 업데이트
conn.execute('''
    UPDATE pricing_factors 
    SET min_factor = 1.20, max_factor = 2.10 
    WHERE part_type = "repair"
''')

conn.execute('''
    UPDATE pricing_factors 
    SET min_factor = 1.20, max_factor = 1.55 
    WHERE part_type = "consumable"
''')

# 테이블 구조 확인
columns = conn.execute('PRAGMA table_info(pricing_factors)').fetchall()
print("\npricing_factors 테이블 구조:")
for col in columns:
    print(f"  {col[1]} {col[2]}")

print("\npricing_factors 데이터:")
factors = conn.execute('SELECT * FROM pricing_factors').fetchall()
for row in factors:
    print(f"  {dict(row)}")

conn.commit()
conn.close()