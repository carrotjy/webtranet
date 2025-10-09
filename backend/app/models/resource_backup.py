import sqlite3
from datetime import datetime
from typing import List, Dict, Optional
import js    @classmethod
    def get_by_id(cls, resource_id: int) -> Optional['Resource']:
        """ID로 리소스 조회"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM resources WHERE id = ?', (resource_id,))
        row = cursor.fetchone()
        
        if row:
            # 관리 이력도 함께 조회
            cursor.execute('''
            SELECT date, content FROM resource_management_history 
            WHERE resource_id = ? ORDER BY date DESC
            ''', (resource_id,))
            history_rows = cursor.fetchall()
            
            management_history = []
            for hist_row in history_rows:
                management_history.append({
                    'date': hist_row[0],
                    'content': hist_row[1]
                })
            
            resource = cls(*row)
            resource.management_history = management_history
            conn.close()
            return resource
        
        conn.close()
        return Noneesource:
    def __init__(self, id=None, customer_id=None, category=None, serial_number=None, 
                 product_name=None, note=None, management_history=None, created_at=None, updated_at=None):
        self.id = id
        self.customer_id = customer_id
        self.category = category
        self.serial_number = serial_number
        self.product_name = product_name
        self.note = note
        self.management_history = management_history or []
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()

    @staticmethod
    def create_table():
        """리소스 테이블과 관리 이력 테이블 생성"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        # 리소스 테이블 생성
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            serial_number TEXT NOT NULL,
            product_name TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
        ''')
        
        # 관리 이력 테이블 생성
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS resource_management_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE CASCADE
        )
        ''')
        
        conn.commit()
        conn.close()

    def save(self):
        """리소스 저장"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        try:
            if self.id:
                # 업데이트
                cursor.execute('''
                UPDATE resources 
                SET customer_id=?, category=?, serial_number=?, product_name=?, note=?
                WHERE id=?
                ''', (self.customer_id, self.category, self.serial_number, 
                      self.product_name, self.note, self.id))
                
                # 기존 관리 이력 삭제
                cursor.execute('DELETE FROM resource_management_history WHERE resource_id=?', (self.id,))
            else:
                # 새로 생성
                cursor.execute('''
                INSERT INTO resources (customer_id, category, serial_number, product_name, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ''', (self.customer_id, self.category, self.serial_number, 
                      self.product_name, self.note, self.created_at.isoformat()))
                
                self.id = cursor.lastrowid
            
            # 관리 이력 저장
            if self.management_history:
                for history in self.management_history:
                    cursor.execute('''
                    INSERT INTO resource_management_history (resource_id, date, content, created_at)
                    VALUES (?, ?, ?, ?)
                    ''', (self.id, history.get('date', ''), history.get('content', ''), datetime.now().isoformat()))
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
        
        return self

    @classmethod
    def get_by_id(cls, resource_id: int):
        """ID로 리소스 조회"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM resources WHERE id = ?', (resource_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return cls(*row)
        return None

    @classmethod
    def get_by_customer_id(cls, customer_id: int) -> List['Resource']:
        """고객 ID로 리소스 목록 조회"""
        try:
            from app.database.init_db import get_db_connection
            conn = get_db_connection()
            
            cursor = conn.execute('SELECT * FROM resources WHERE customer_id = ? ORDER BY created_at DESC', 
                          (customer_id,))
            rows = cursor.fetchall()
            conn.close()
            
            resources = []
            for row in rows:
                try:
                    resource = cls(*row)
                    resources.append(resource)
                except Exception as e:
                    print(f"[ERROR] Failed to create resource from row: {e}")
                    print(f"[ERROR] Row data: {row}")
                    # 에러가 발생한 리소스는 건너뛰고 계속 진행
                    continue
            
            return resources
        except Exception as e:
            print(f"[ERROR] get_by_customer_id failed: {e}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return []  # 에러 시 빈 리스트 반환

    @classmethod
    def get_all(cls) -> List['Resource']:
        """모든 리소스 조회"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM resources ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()
        
        return [cls(*row) for row in rows]
    
    @classmethod
    def get_all_with_customer_info(cls) -> List[Dict]:
        """고객 정보와 함께 모든 리소스 조회"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT 
            r.id, r.customer_id, r.category, r.serial_number, 
            r.product_name, r.note, r.created_at,
            c.company_name as customer_name
        FROM resources r
        LEFT JOIN customers c ON r.customer_id = c.id
        ORDER BY r.created_at DESC
        ''')
        
        rows = cursor.fetchall()
        
        resources = []
        for row in rows:
            resource_id = row[0]
            
            # 해당 리소스의 관리 이력 조회
            cursor.execute('''
            SELECT date, content FROM resource_management_history 
            WHERE resource_id = ? ORDER BY date DESC
            ''', (resource_id,))
            history_rows = cursor.fetchall()
            
            management_history = []
            for hist_row in history_rows:
                management_history.append({
                    'date': hist_row[0],
                    'content': hist_row[1]
                })
            
            resource_dict = {
                'id': row[0],
                'customer_id': row[1],
                'category': row[2],
                'serial_number': row[3],
                'product_name': row[4],
                'note': row[5],
                'created_at': row[6],
                'customer_name': row[7] if row[7] else '알 수 없음',
                'management_history': management_history
            }
            resources.append(resource_dict)
        
        conn.close()
        return resources

    def delete(self):
        """리소스 삭제"""
        if self.id:
            conn = sqlite3.connect('app/database/user.db')
            cursor = conn.cursor()
            cursor.execute('DELETE FROM resources WHERE id = ?', (self.id,))
            conn.commit()
            conn.close()

    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        try:
            # created_at 안전 처리
            created_at_str = self.created_at
            if isinstance(self.created_at, datetime):
                created_at_str = self.created_at.isoformat()
            elif self.created_at is None:
                created_at_str = ""
            else:
                created_at_str = str(self.created_at)
            
            # updated_at 안전 처리
            updated_at_str = self.updated_at
            if isinstance(self.updated_at, datetime):
                updated_at_str = self.updated_at.isoformat()
            elif self.updated_at is None:
                updated_at_str = ""
            else:
                updated_at_str = str(self.updated_at)
            
            return {
                'id': self.id,
                'customer_id': self.customer_id,
                'category': self.category or '',
                'serial_number': self.serial_number or '',
                'product_name': self.product_name or '',
                'note': self.note or '',
                'created_at': created_at_str,
                'updated_at': updated_at_str
            }
        except Exception as e:
            print(f"[ERROR] Resource to_dict failed: {e}")
            return {
                'id': self.id,
                'customer_id': self.customer_id,
                'category': '',
                'serial_number': '',
                'product_name': '',
                'note': '',
                'created_at': ''
            }

    @classmethod
    def from_dict(cls, data: Dict):
        """딕셔너리에서 객체 생성"""
        created_at = data.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
            
        updated_at = data.get('updated_at')
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return cls(
            id=data.get('id'),
            customer_id=data.get('customer_id'),
            category=data.get('category'),
            serial_number=data.get('serial_number'),
            product_name=data.get('product_name'),
            note=data.get('note'),
            created_at=created_at,
            updated_at=updated_at
        )