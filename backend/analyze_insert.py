import sqlite3

conn = sqlite3.connect('app/database/user.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(users)')
columns = cursor.fetchall()

print("=== DATABASE SCHEMA ===")
for i, col in enumerate(columns):
    print(f"{i+1:2d}. {col[1]} ({col[2]})")

print(f"\nTotal columns: {len(columns)}")
print(f"Columns excluding id: {len(columns) - 1}")

conn.close()

# INSERT 쿼리 분석
insert_columns = [
    'name', 'email', 'password', 'contact', 'department',
    'service_report_access', 'transaction_access', 'customer_access', 'spare_parts_access', 
    'resource_access', 'is_admin', 'created_at', 'updated_at', 'role',
    'spare_parts_edit', 'spare_parts_delete', 'spare_parts_stock_in', 'spare_parts_stock_out',
    'service_report_create', 'service_report_read', 'service_report_update', 'service_report_delete',
    'resource_create', 'resource_read', 'resource_update', 'resource_delete',
    'customer_create', 'customer_read', 'customer_update', 'customer_delete',
    'transaction_create', 'transaction_read', 'transaction_update', 'transaction_delete',
    'spare_parts_create', 'spare_parts_read', 'spare_parts_update', 'spare_parts_delete_crud'
]

print(f"\n=== INSERT QUERY COLUMNS ===")
for i, col in enumerate(insert_columns):
    print(f"{i+1:2d}. {col}")
print(f"Total INSERT columns: {len(insert_columns)}")

# 파라미터 분석
params = [
    'self.name', 'self.email', 'hashed_password', 'self.contact', 'self.department',
    'self.service_report_access', 'self.transaction_access', 'self.customer_access',
    'self.spare_parts_access', 'resource_access', 'self.is_admin', '사용자',
    'spare_parts_edit', 'spare_parts_delete', 'spare_parts_stock_in', 'spare_parts_stock_out',
    'service_report_create', 'service_report_read', 'service_report_update', 'service_report_delete',
    'resource_create', 'resource_read', 'resource_update', 'resource_delete',
    'customer_create', 'customer_read', 'customer_update', 'customer_delete',
    'transaction_create', 'transaction_read', 'transaction_update', 'transaction_delete',
    'spare_parts_create', 'spare_parts_read', 'spare_parts_update', 'spare_parts_delete_crud'
]

print(f"\n=== PARAMETERS ===")
for i, param in enumerate(params):
    print(f"{i+1:2d}. {param}")
print(f"Total parameters: {len(params)}")

# CURRENT_TIMESTAMP 컬럼
timestamp_cols = ['created_at', 'updated_at']
print(f"\nCURRENT_TIMESTAMP columns: {timestamp_cols}")
print(f"Required ? count: {len(insert_columns) - len(timestamp_cols)} = {len(insert_columns)} - {len(timestamp_cols)}")