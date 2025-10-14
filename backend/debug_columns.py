import sqlite3

conn = sqlite3.connect('app/database/user.db')
cursor = conn.cursor()

# 실제 테이블 스키마를 확인하고 VALUES 절 생성
cursor.execute('PRAGMA table_info(users)')
columns = cursor.fetchall()

print("Database columns (excluding id):")
col_names = []
for i, col in enumerate(columns):
    if col[1] != 'id':  # id 제외
        col_names.append(col[1])
        print(f"{len(col_names):2d}. {col[1]}")

print(f"\nTotal columns (excluding id): {len(col_names)}")

# VALUES 절에서 CURRENT_TIMESTAMP 사용하는 컬럼 확인
timestamp_cols = ['created_at', 'updated_at']
param_count = len(col_names) - len(timestamp_cols)
print(f"Parameters needed: {param_count} (excluding {len(timestamp_cols)} CURRENT_TIMESTAMP columns)")

# VALUES 절 생성
values_parts = []
for col in col_names:
    if col in timestamp_cols:
        values_parts.append('CURRENT_TIMESTAMP')
    else:
        values_parts.append('?')

print(f"\nCorrect VALUES clause:")
print(f"VALUES ({', '.join(values_parts)})")

conn.close()