import sqlite3

conn = sqlite3.connect('app/database/user.db')

# price_history 테이블에 통화 정보 추가
try:
    conn.execute('ALTER TABLE price_history ADD COLUMN currency TEXT DEFAULT "KRW"')
    print("price_history 테이블에 currency 컬럼이 추가되었습니다.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("currency 컬럼이 이미 존재합니다.")
    else:
        print(f"오류: {e}")

# 컬럼 추가 확인
columns = conn.execute('PRAGMA table_info(price_history)').fetchall()
print("\nprice_history 테이블 구조:")
for col in columns:
    print(f"  {col[1]} {col[2]}")

conn.close()