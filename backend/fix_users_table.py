import sqlite3
from app.database.init_db import get_db_connection

def fix_users_table():
    """users 테이블에 PRIMARY KEY AUTOINCREMENT 추가"""
    conn = get_db_connection()
    
    try:
        # 기존 데이터 백업
        print("기존 사용자 데이터를 백업하는 중...")
        users_data = conn.execute("SELECT * FROM users").fetchall()
        
        # 기존 테이블 삭제
        print("기존 테이블을 삭제하는 중...")
        conn.execute("DROP TABLE IF EXISTS users")
        
        # 새 테이블 생성 (PRIMARY KEY AUTOINCREMENT 포함)
        print("새 테이블을 생성하는 중...")
        conn.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                contact TEXT,
                department TEXT,
                service_report_access INTEGER DEFAULT 0,
                transaction_access INTEGER DEFAULT 0,
                customer_access INTEGER DEFAULT 0,
                spare_parts_access INTEGER DEFAULT 0,
                resource_access INTEGER DEFAULT 0,
                is_admin INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                role TEXT,
                spare_parts_edit INTEGER DEFAULT 1,
                spare_parts_delete INTEGER DEFAULT 1,
                spare_parts_stock_in INTEGER DEFAULT 1,
                spare_parts_stock_out INTEGER DEFAULT 1,
                service_report_create INTEGER DEFAULT 0,
                service_report_read INTEGER DEFAULT 0,
                service_report_update INTEGER DEFAULT 0,
                service_report_delete INTEGER DEFAULT 0,
                resource_create INTEGER DEFAULT 0,
                resource_read INTEGER DEFAULT 0,
                resource_update INTEGER DEFAULT 0,
                resource_delete INTEGER DEFAULT 0,
                customer_create INTEGER DEFAULT 0,
                customer_read INTEGER DEFAULT 0,
                customer_update INTEGER DEFAULT 0,
                customer_delete INTEGER DEFAULT 0,
                transaction_create INTEGER DEFAULT 0,
                transaction_read INTEGER DEFAULT 0,
                transaction_update INTEGER DEFAULT 0,
                transaction_delete INTEGER DEFAULT 0,
                spare_parts_create INTEGER DEFAULT 0,
                spare_parts_read INTEGER DEFAULT 0,
                spare_parts_update INTEGER DEFAULT 0,
                spare_parts_delete_crud INTEGER DEFAULT 0
            )
        ''')
        
        # 백업된 데이터 복원
        print("데이터를 복원하는 중...")
        for user in users_data:
            # created_at 설정 (NULL이면 현재 시간)
            created_at = user['created_at'] if user['created_at'] else 'CURRENT_TIMESTAMP'
            
            conn.execute('''
                INSERT INTO users (
                    name, email, password, contact, department,
                    service_report_access, transaction_access, customer_access,
                    spare_parts_access, resource_access, is_admin,
                    created_at, updated_at, role,
                    spare_parts_edit, spare_parts_delete, spare_parts_stock_in, spare_parts_stock_out,
                    service_report_create, service_report_read, service_report_update, service_report_delete,
                    resource_create, resource_read, resource_update, resource_delete,
                    customer_create, customer_read, customer_update, customer_delete,
                    transaction_create, transaction_read, transaction_update, transaction_delete,
                    spare_parts_create, spare_parts_read, spare_parts_update, spare_parts_delete_crud
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user['name'], user['email'], user['password'], user['contact'], user['department'],
                user['service_report_access'], user['transaction_access'], user['customer_access'],
                user['spare_parts_access'], user['resource_access'], user['is_admin'],
                user['created_at'], user['updated_at'], user['role'],
                user['spare_parts_edit'], user['spare_parts_delete'], user['spare_parts_stock_in'], user['spare_parts_stock_out'],
                user['service_report_create'], user['service_report_read'], user['service_report_update'], user['service_report_delete'],
                user['resource_create'], user['resource_read'], user['resource_update'], user['resource_delete'],
                user['customer_create'], user['customer_read'], user['customer_update'], user['customer_delete'],
                user['transaction_create'], user['transaction_read'], user['transaction_update'], user['transaction_delete'],
                user['spare_parts_create'], user['spare_parts_read'], user['spare_parts_update'], user['spare_parts_delete_crud']
            ))
        
        conn.commit()
        print("사용자 테이블 수정이 완료되었습니다!")
        
        # 결과 확인
        result = conn.execute("SELECT id, name, email FROM users").fetchall()
        print(f"총 {len(result)}명의 사용자가 복원되었습니다:")
        for user in result:
            print(f"  ID: {user['id']}, 이름: {user['name']}, 이메일: {user['email']}")
            
    except Exception as e:
        print(f"오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    fix_users_table()