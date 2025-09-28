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
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            contact TEXT,
            department TEXT,
            service_report_access BOOLEAN DEFAULT 0,
            transaction_access BOOLEAN DEFAULT 0,
            customer_access BOOLEAN DEFAULT 0,
            spare_parts_access BOOLEAN DEFAULT 0,
            is_admin BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
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
    
    # 거래명세서 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            service_report_id INTEGER,
            transaction_date DATE NOT NULL,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (service_report_id) REFERENCES service_reports (id)
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
    
    # 거래 상세 항목 테이블 생성
    conn.execute('''
        CREATE TABLE IF NOT EXISTS transaction_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER,
            item_type TEXT NOT NULL, -- 'service' or 'part'
            item_id INTEGER, -- service_report_id or spare_part_id
            description TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit_price REAL DEFAULT 0,
            total_price REAL DEFAULT 0,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
    ''')
    
    conn.commit()
    
    # 초기 데이터 삽입
    create_initial_data(conn)
    
    conn.close()
    print("Database initialized successfully!")

def create_initial_data(conn):
    """초기 관리자 계정과 샘플 데이터를 생성합니다."""
    
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
                             customer_access, spare_parts_access, is_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('관리자', 'admin@webtranet.com', admin_password.decode('utf-8'),
              '02-1234-5678', '관리부', 1, 1, 1, 1, 1))
        
        # 테스트용 일반 사용자 생성
        user_password = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt())
        conn.execute('''
            INSERT INTO users (name, email, password, contact, department,
                             service_report_access, transaction_access,
                             customer_access, spare_parts_access, is_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('김기술', 'technician@webtranet.com', user_password.decode('utf-8'),
              '010-1234-5678', '기술부', 1, 0, 1, 1, 0))
        
        # 샘플 고객 데이터
        conn.execute('''
            INSERT INTO customers (company_name, contact_person, email, phone, address)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ABC 제조', '홍길동', 'contact@abc.com', '02-9876-5432', '서울시 강남구 테헤란로 123'))
        
        conn.execute('''
            INSERT INTO customers (company_name, contact_person, email, phone, address)
            VALUES (?, ?, ?, ?, ?)
        ''', ('XYZ 공업', '이순신', 'info@xyz.com', '031-555-1234', '경기도 성남시 분당구 판교로 456'))
        
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