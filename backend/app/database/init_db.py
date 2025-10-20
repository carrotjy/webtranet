import sqlite3
import bcrypt
import os
from datetime import datetime

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'user.db')

def get_db_connection():
    """데이터베이스 연결을 반환합니다."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """데이터베이스와 테이블을 초기화합니다."""
    conn = get_db_connection()

    # 사용자 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT UNIQUE,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            contact TEXT,
            department TEXT,
            role TEXT DEFAULT '사용자',
            service_report_access BOOLEAN DEFAULT 0,
            invoice_access BOOLEAN DEFAULT 0,
            transaction_access BOOLEAN DEFAULT 0,
            customer_access BOOLEAN DEFAULT 0,
            spare_parts_access BOOLEAN DEFAULT 0,
            resource_access BOOLEAN DEFAULT 0,
            is_admin BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 기존 사용자 테이블에 username, role 컬럼이 없다면 추가
    try:
        conn.execute('ALTER TABLE users ADD COLUMN username TEXT UNIQUE')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    try:
        conn.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "사용자"')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    # users 테이블에 transaction_access 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE users ADD COLUMN transaction_access BOOLEAN DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    # users 테이블에 resource_access 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE users ADD COLUMN resource_access BOOLEAN DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    # users 테이블에 spare_parts 관련 권한 컬럼 추가
    spare_parts_columns = [
        'spare_parts_edit', 'spare_parts_delete',
        'spare_parts_stock_in', 'spare_parts_stock_out'
    ]
    for col in spare_parts_columns:
        try:
            conn.execute(f'ALTER TABLE users ADD COLUMN {col} BOOLEAN DEFAULT 1')
        except sqlite3.OperationalError:
            pass

    # users 테이블에 CRUD 권한 컬럼들 추가
    crud_columns = [
        # 서비스 리포트 CRUD
        'service_report_create', 'service_report_read',
        'service_report_update', 'service_report_delete',
        # 리소스 CRUD
        'resource_create', 'resource_read',
        'resource_update', 'resource_delete',
        # 고객 CRUD
        'customer_create', 'customer_read',
        'customer_update', 'customer_delete',
        # 거래명세서 CRUD
        'transaction_create', 'transaction_read',
        'transaction_update', 'transaction_delete',
        # 부품 CRUD
        'spare_parts_create', 'spare_parts_read',
        'spare_parts_update', 'spare_parts_delete_crud'
    ]
    for col in crud_columns:
        try:
            conn.execute(f'ALTER TABLE users ADD COLUMN {col} BOOLEAN DEFAULT 0')
        except sqlite3.OperationalError:
            pass

    # 서비스 리포트 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS service_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            technician_id INTEGER,
            machine_model TEXT,
            machine_serial TEXT,
            service_date DATE NOT NULL,
            problem_description TEXT,
            solution_description TEXT,
            parts_used TEXT,
            work_hours REAL,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (technician_id) REFERENCES users (id)
        )
    ''')
    
    # 고객 정보 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            contact_person TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            postal_code TEXT,
            tel TEXT,
            fax TEXT,
            president TEXT,
            mobile TEXT,
            contact TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 기존 customers 테이블에 새 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE customers ADD COLUMN postal_code TEXT')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함
    
    try:
        conn.execute('ALTER TABLE customers ADD COLUMN tel TEXT')
    except sqlite3.OperationalError:
        pass
    
    try:
        conn.execute('ALTER TABLE customers ADD COLUMN fax TEXT')
    except sqlite3.OperationalError:
        pass
    
    try:
        conn.execute('ALTER TABLE customers ADD COLUMN president TEXT')
    except sqlite3.OperationalError:
        pass
    
    try:
        conn.execute('ALTER TABLE customers ADD COLUMN mobile TEXT')
    except sqlite3.OperationalError:
        pass
    
    try:
        conn.execute('ALTER TABLE customers ADD COLUMN contact TEXT')
    except sqlite3.OperationalError:
        pass

    # service_reports 테이블에 invoice_code_id 컬럼 추가
    try:
        conn.execute('ALTER TABLE service_reports ADD COLUMN invoice_code_id INTEGER')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함
    
    # service_reports 테이블에 invoice_code_id 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE service_reports ADD COLUMN invoice_code_id INTEGER REFERENCES invoice_codes(id)')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    # service_reports 테이블에 is_locked 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE service_reports ADD COLUMN is_locked BOOLEAN DEFAULT 0')
        print("Added is_locked column to service_reports table")
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    # service_reports 테이블에 locked_by 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE service_reports ADD COLUMN locked_by INTEGER')
        print("Added locked_by column to service_reports table")
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    # service_reports 테이블에 locked_at 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE service_reports ADD COLUMN locked_at TIMESTAMP')
        print("Added locked_at column to service_reports table")
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함

    # invoice_codes 테이블에 category 컬럼 추가 (마이그레이션)
    try:
        conn.execute('ALTER TABLE invoice_codes ADD COLUMN category TEXT DEFAULT NULL')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함
    
    # 거래명세표 요율 설정 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS invoice_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_rate REAL DEFAULT 50000,
            travel_rate REAL DEFAULT 30000,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 거래명세표 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_report_id INTEGER,
            invoice_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            customer_name TEXT,
            customer_address TEXT,
            issue_date DATE,
            due_date DATE,
            work_subtotal REAL DEFAULT 0,
            travel_subtotal REAL DEFAULT 0,
            parts_subtotal REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            vat_amount REAL DEFAULT 0,
            grand_total REAL DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_report_id) REFERENCES service_reports (id),
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
    ''')
    
    # 거래명세표 항목 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            item_type TEXT NOT NULL CHECK(item_type IN ('work', 'travel', 'parts')),
            description TEXT NOT NULL,
            quantity REAL DEFAULT 0,
            unit_price REAL DEFAULT 0,
            total_price REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
        )
    ''')
    
    # 서비스 리포트 사용부품 테이블 생성 (1:N 관계)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS service_report_parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_report_id INTEGER NOT NULL,
            part_name TEXT NOT NULL,
            part_number TEXT,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price REAL DEFAULT 0.0,
            total_price REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_report_id) REFERENCES service_reports (id) ON DELETE CASCADE
        )
    ''')
    
    # 서비스 리포트 시간기록 테이블 생성 (1:N 관계)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS service_report_time_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_report_id INTEGER NOT NULL,
            work_date DATE NOT NULL,
            departure_time TEXT,
            work_start_time TEXT,
            work_end_time TEXT,
            travel_end_time TEXT,
            work_meal_time TEXT,
            travel_meal_time TEXT,
            calculated_work_time TEXT,
            calculated_travel_time TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_report_id) REFERENCES service_reports (id) ON DELETE CASCADE
        )
    ''')

    # 리소스 테이블 생성 (고객의 보유 장비)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            serial_number TEXT NOT NULL,
            product_name TEXT NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
    ''')

    # 리소스 관리 히스토리 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS resource_management_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            changed_by INTEGER,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            old_data TEXT,
            new_data TEXT,
            FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE CASCADE,
            FOREIGN KEY (changed_by) REFERENCES users (id)
        )
    ''')
    
    # Invoice 코드 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS invoice_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL CHECK(LENGTH(code) = 3 AND code GLOB '[0-9][0-9][0-9]'),
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 스페어파트 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS spare_parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            part_number TEXT UNIQUE NOT NULL,
            part_name TEXT NOT NULL,
            description TEXT,
            price REAL DEFAULT 0,
            stock_quantity INTEGER DEFAULT 0,
            minimum_stock INTEGER DEFAULT 0,
            supplier TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 가격 히스토리 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS price_history (
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
    
    # price_history 테이블에 billing_price 컬럼 추가 (migration)
    try:
        conn.execute('ALTER TABLE price_history ADD COLUMN billing_price REAL DEFAULT 0')
        print("Added billing_price column to price_history table")
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함
        
    # price_history 테이블에 currency 컬럼 추가 (기존 migration)
    try:
        conn.execute('ALTER TABLE price_history ADD COLUMN currency TEXT DEFAULT "KRW"')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함
        
    # price_history 테이블에 part_type 컬럼 추가 (기존 migration)
    try:
        conn.execute('ALTER TABLE price_history ADD COLUMN part_type TEXT DEFAULT "repair"')
    except sqlite3.OperationalError:
        pass  # 컬럼이 이미 존재함
    
    # 사용자별 스페어파트 권한 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS user_spare_part_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            can_edit BOOLEAN DEFAULT 0,
            can_delete BOOLEAN DEFAULT 0,
            can_inbound BOOLEAN DEFAULT 0,
            can_outbound BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(user_id)
        )
    ''')
    
    # 거래 상세 항목 테이블 생성
    
    conn.commit()
    
    # 초기 데이터 삽입
    create_initial_data(conn)
    
    conn.close()
    print("Database initialized successfully!")

def create_initial_data(conn):
    """초기 관리자 계정과 샘플 데이터를 생성합니다."""
    
    # 사용자가 이미 존재하는지 확인
    users_exist = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    
    if users_exist > 0:
        # 이미 사용자가 있으면 초기 데이터 생성을 건너뜀
        return
    
    # admin 계정이 이미 존재하는지 확인
    admin_exists = conn.execute(
        'SELECT id FROM users WHERE email = ?', ('admin@webtranet.com',)
    ).fetchone()
    
    if not admin_exists:
        # admin 계정 생성
        admin_password = bcrypt.hashpw('admin'.encode('utf-8'), bcrypt.gensalt())
        conn.execute('''
            INSERT INTO users (name, email, password, contact, department,
                             service_report_access, transaction_access, 
                             customer_access, spare_parts_access, resource_access, is_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('관리자', 'admin@webtranet.com', admin_password.decode('utf-8'),
              '02-1234-5678', '관리부', 1, 1, 1, 1, 1, 1))
        
        # 테스트용 일반 사용자들 생성 (기존 사용자가 있으므로 생략)
        # 기존 사용자들이 이미 있으므로 추가 생성하지 않음
        
        # 샘플 고객 데이터
        conn.execute('''
            INSERT INTO customers (company_name, contact_person, email, phone, address)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ABC 제조', '홍길동', 'contact@abc.com', '02-9876-5432', '서울시 강남구 테헤란로 123'))
        
        conn.execute('''
            INSERT INTO customers (company_name, contact_person, email, phone, address)
            VALUES (?, ?, ?, ?, ?)
        ''', ('XYZ 공업', '이순신', 'info@xyz.com', '031-555-1234', '경기도 성남시 분당구 판교로 456'))
        
        # 샘플 Invoice 코드 데이터
        conn.execute('''
            INSERT OR IGNORE INTO invoice_codes (code, description)
            VALUES (?, ?)
        ''', ('001', '정기점검'))
        
        conn.execute('''
            INSERT OR IGNORE INTO invoice_codes (code, description)
            VALUES (?, ?)
        ''', ('002', '긴급수리'))
        
        conn.execute('''
            INSERT OR IGNORE INTO invoice_codes (code, description)
            VALUES (?, ?)
        ''', ('003', '부품교체'))
        
        conn.execute('''
            INSERT OR IGNORE INTO invoice_codes (code, description)
            VALUES (?, ?)
        ''', ('004', '소프트웨어 업데이트'))
        
        conn.execute('''
            INSERT OR IGNORE INTO invoice_codes (code, description)
            VALUES (?, ?)
        ''', ('005', '설치 및 설정'))

        # 샘플 스페어파트 데이터
        conn.execute('''
            INSERT INTO spare_parts (part_number, part_name, description, price, stock_quantity, minimum_stock, supplier)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ('SP001', '베어링', '고속 스핀들용 베어링', 150000, 10, 3, '부품업체A'))
        
        conn.execute('''
            INSERT INTO spare_parts (part_number, part_name, description, price, stock_quantity, minimum_stock, supplier)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ('SP002', '모터', '서보 모터 1.5kW', 850000, 5, 2, '부품업체B'))
        
        # 샘플 리소스 데이터 (고객의 보유 장비)
        conn.execute('''
            INSERT INTO resources (customer_id, category, serial_number, product_name, note)
            VALUES (?, ?, ?, ?, ?)
        ''', (1, 'CNC 머시닝센터', 'LVD-MC001', 'Phoenix FL-3015', '2022년 설치'))
        
        conn.execute('''
            INSERT INTO resources (customer_id, category, serial_number, product_name, note)
            VALUES (?, ?, ?, ?, ?)
        ''', (1, '레이저 커팅기', 'LVD-LC001', 'Electra FL-3015', '메인 생산라인'))
        
        conn.execute('''
            INSERT INTO resources (customer_id, category, serial_number, product_name, note)
            VALUES (?, ?, ?, ?, ?)
        ''', (2, '펀칭머신', 'LVD-PM001', 'Strippit PX-1530', '2021년 도입'))
        
        conn.execute('''
            INSERT INTO resources (customer_id, category, serial_number, product_name, note)
            VALUES (?, ?, ?, ?, ?)
        ''', (2, '밴딩머신', 'LVD-BM001', 'ToolCell-Compact', '자동화 라인'))
        
        conn.commit()
        print("Initial data created successfully!")

if __name__ == '__main__':
    init_database()