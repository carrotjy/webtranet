"""
JSharp Database Module
J# 주문 관리를 위한 SQLite 데이터베이스
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'instance', 'jsharp.db')


def init_db():
    """데이터베이스 초기화 및 테이블 생성"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # orders 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site TEXT NOT NULL,
            order_number TEXT NOT NULL,
            order_date TEXT,
            buyer_name TEXT,
            recipient_name TEXT NOT NULL,
            phone TEXT,
            phone2 TEXT,
            address TEXT,
            delivery_memo TEXT,
            product_name TEXT,
            quantity INTEGER DEFAULT 1,
            option_info TEXT,
            additional_items TEXT,
            price REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(site, order_number)
        )
    ''')
    
    # status 컬럼이 없는 경우 추가 (기존 DB 마이그레이션)
    try:
        cursor.execute("ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending'")
        conn.commit()
        print("Added status column to orders table")
    except sqlite3.OperationalError:
        # 컬럼이 이미 존재하면 무시
        pass
    
    # 인덱스 생성
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_orders_site_order_number 
        ON orders(site, order_number)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_orders_created_at 
        ON orders(created_at DESC)
    ''')
    
    conn.commit()
    conn.close()
    print(f"JSharp DB initialized at: {DB_PATH}")


def insert_order(order_data):
    """
    주문 데이터 삽입 (중복 시 무시)
    
    Args:
        order_data: dict with keys: site, order_number, order_date, buyer_name,
                    recipient_name, phone, phone2, address, delivery_memo,
                    product_name, quantity, option, additional_items, price
    
    Returns:
        tuple: (success: bool, message: str, is_duplicate: bool)
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 중복 체크 - 11번가처럼 같은 주문번호에 여러 상품이 있을 수 있으므로
        # site + order_number + product_name + option 조합으로 체크
        cursor.execute('''
            SELECT id FROM orders
            WHERE site = ? AND order_number = ? AND product_name = ? AND option_info = ?
        ''', (
            order_data['site'],
            order_data['order_number'],
            order_data.get('product_name', ''),
            order_data.get('option', '')
        ))

        if cursor.fetchone():
            conn.close()
            return (False, f"중복: {order_data['site']} - {order_data['order_number']} - {order_data.get('product_name', '')}", True)
        
        # 삽입
        cursor.execute('''
            INSERT INTO orders (
                site, order_number, order_date, buyer_name, recipient_name,
                phone, phone2, address, delivery_memo, product_name,
                quantity, option_info, additional_items, price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            order_data.get('site', ''),
            order_data.get('order_number', ''),
            order_data.get('order_date', ''),
            order_data.get('buyer_name', ''),
            order_data.get('recipient_name', ''),
            order_data.get('phone', ''),
            order_data.get('phone2', ''),
            order_data.get('address', ''),
            order_data.get('delivery_memo', ''),
            order_data.get('product_name', ''),
            order_data.get('quantity', 1),
            order_data.get('option', ''),
            order_data.get('additional_items', ''),
            order_data.get('price', 0)
        ))
        
        conn.commit()
        conn.close()
        return (True, "저장 성공", False)
        
    except Exception as e:
        conn.close()
        return (False, f"저장 실패: {str(e)}", False)


def get_all_orders(site=None, limit=None):
    """
    모든 주문 조회
    
    Args:
        site: 특정 사이트 필터 (optional)
        limit: 최대 조회 개수 (optional)
    
    Returns:
        list: 주문 데이터 리스트
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if site:
        query = '''
            SELECT * FROM orders 
            WHERE site = ?
            ORDER BY created_at DESC
        '''
        params = (site,)
    else:
        query = '''
            SELECT * FROM orders 
            ORDER BY created_at DESC
        '''
        params = ()
    
    if limit:
        query += ' LIMIT ?'
        params = params + (limit,)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    orders = []
    for row in rows:
        # Handle potential missing 'status' column for old databases
        try:
            status = row['status']
        except (KeyError, IndexError):
            status = 'pending'
        
        orders.append({
            'id': row['id'],
            'site': row['site'],
            'order_number': row['order_number'],
            'order_date': row['order_date'],
            'buyer_name': row['buyer_name'],
            'recipient_name': row['recipient_name'],
            'phone': row['phone'],
            'phone2': row['phone2'],
            'address': row['address'],
            'delivery_memo': row['delivery_memo'],
            'product_name': row['product_name'],
            'quantity': row['quantity'],
            'option': row['option_info'],
            'additional_items': row['additional_items'],
            'price': row['price'],
            'status': status,
            'created_at': row['created_at']
        })
    
    conn.close()
    return orders


def update_order_status(order_id, status):
    """주문 상태 업데이트 (pending/completed)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('UPDATE orders SET status = ? WHERE id = ?', (status, order_id))
        conn.commit()
        conn.close()
        return (True, f"상태 업데이트 성공: {status}")
    except Exception as e:
        conn.close()
        return (False, f"상태 업데이트 실패: {str(e)}")


def delete_order(order_id):
    """주문 삭제"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM orders WHERE id = ?', (order_id,))
        conn.commit()
        conn.close()
        return (True, "삭제 성공")
    except Exception as e:
        conn.close()
        return (False, f"삭제 실패: {str(e)}")


def clear_all_orders():
    """모든 주문 삭제 (테스트용)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM orders')
        conn.commit()
        conn.close()
        return (True, "모든 주문 삭제 완료")
    except Exception as e:
        conn.close()
        return (False, f"삭제 실패: {str(e)}")


# 앱 시작 시 DB 초기화
init_db()
