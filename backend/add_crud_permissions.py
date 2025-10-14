import sqlite3
from app.database.init_db import get_db_connection

def add_crud_permissions():
    """리포트, 리소스, 고객정보에 대한 CRUD 권한 필드 추가"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 새로운 권한 필드들 추가
    new_fields = [
        # 서비스 리포트 CRUD 권한
        'service_report_create BOOLEAN DEFAULT 0',
        'service_report_read BOOLEAN DEFAULT 0', 
        'service_report_update BOOLEAN DEFAULT 0',
        'service_report_delete BOOLEAN DEFAULT 0',
        
        # 리소스 CRUD 권한
        'resource_create BOOLEAN DEFAULT 0',
        'resource_read BOOLEAN DEFAULT 0',
        'resource_update BOOLEAN DEFAULT 0', 
        'resource_delete BOOLEAN DEFAULT 0',
        
        # 고객정보 CRUD 권한
        'customer_create BOOLEAN DEFAULT 0',
        'customer_read BOOLEAN DEFAULT 0',
        'customer_update BOOLEAN DEFAULT 0',
        'customer_delete BOOLEAN DEFAULT 0'
    ]
    
    for field in new_fields:
        try:
            cursor.execute(f'ALTER TABLE users ADD COLUMN {field}')
            print(f'Added field: {field}')
        except sqlite3.OperationalError as e:
            if 'duplicate column name' in str(e):
                print(f'Field already exists: {field}')
            else:
                print(f'Error adding field {field}: {e}')
    
    conn.commit()
    conn.close()
    
    print('CRUD permissions fields added successfully!')

if __name__ == '__main__':
    add_crud_permissions()