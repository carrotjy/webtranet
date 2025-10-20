import sqlite3
from datetime import datetime
from typing import List, Dict, Optional
import json

class Resource:
    def __init__(self, id=None, customer_id=None, category=None, serial_number=None, 
                 product_name=None, note=None, created_at=None, updated_at=None, management_history=None):
        self.id = id
        self.customer_id = customer_id
        self.category = category
        self.serial_number = serial_number
        self.product_name = product_name
        self.note = note
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
        self.management_history = management_history or []

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
                    INSERT INTO resource_management_history (resource_id, action, new_data, changed_at)
                    VALUES (?, ?, ?, ?)
                    ''', (self.id, 'update', history.get('content', ''), history.get('date', datetime.now().isoformat())))
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
        
        return self

    @classmethod
    def get_by_id(cls, resource_id: int) -> Optional['Resource']:
        """ID로 리소스 조회"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM resources WHERE id = ?', (resource_id,))
        row = cursor.fetchone()
        
        if row:
            # 관리 이력도 함께 조회
            cursor.execute('''
            SELECT changed_at, action, old_data, new_data FROM resource_management_history
            WHERE resource_id = ? ORDER BY changed_at DESC
            ''', (resource_id,))
            history_rows = cursor.fetchall()

            management_history = []
            for hist_row in history_rows:
                management_history.append({
                    'date': hist_row[0],
                    'content': f"{hist_row[1]}: {hist_row[3] or ''}"
                })
            
            # 데이터베이스 스키마에 맞는 순서로 Resource 객체 생성
            resource = cls(
                id=row[0],
                customer_id=row[1], 
                category=row[2],
                serial_number=row[3],
                product_name=row[4],
                note=row[5],
                created_at=row[6],
                updated_at=row[7],
                management_history=management_history
            )
            conn.close()
            return resource
        
        conn.close()
        return None

    @classmethod
    def get_by_customer_id(cls, customer_id: int) -> List['Resource']:
        """고객 ID로 리소스 목록 조회"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM resources WHERE customer_id = ? ORDER BY created_at DESC', (customer_id,))
        rows = cursor.fetchall()
        
        resources = []
        for row in rows:
            # 관리 이력도 함께 조회
            cursor.execute('''
            SELECT changed_at, action, old_data, new_data FROM resource_management_history
            WHERE resource_id = ? ORDER BY changed_at DESC
            ''', (row[0],))  # row[0]은 resource id
            history_rows = cursor.fetchall()

            management_history = []
            for hist_row in history_rows:
                management_history.append({
                    'date': hist_row[0],
                    'content': f"{hist_row[1]}: {hist_row[3] or ''}"
                })
            
            # 데이터베이스 스키마에 맞는 순서로 Resource 객체 생성
            # (id, customer_id, category, serial_number, product_name, note, created_at, updated_at)
            resource = cls(
                id=row[0],
                customer_id=row[1], 
                category=row[2],
                serial_number=row[3],
                product_name=row[4],
                note=row[5],
                created_at=row[6],
                updated_at=row[7],
                management_history=management_history
            )
            resources.append(resource)
        
        conn.close()
        return resources

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
            SELECT changed_at, action, old_data, new_data FROM resource_management_history
            WHERE resource_id = ? ORDER BY changed_at DESC
            ''', (resource_id,))
            history_rows = cursor.fetchall()

            management_history = []
            for hist_row in history_rows:
                management_history.append({
                    'date': hist_row[0],
                    'content': f"{hist_row[1]}: {hist_row[3] or ''}"
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

    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        try:
            created_at_str = self.created_at
            if isinstance(self.created_at, datetime):
                created_at_str = self.created_at.isoformat()
            
            return {
                'id': self.id,
                'customer_id': self.customer_id,
                'category': self.category,
                'serial_number': self.serial_number,
                'product_name': self.product_name,
                'note': self.note,
                'management_history': self.management_history,
                'created_at': created_at_str
            }
        except Exception as e:
            print(f'[ERROR] Failed to convert Resource to dict: {e}')
            return {
                'id': self.id,
                'customer_id': self.customer_id,
                'category': self.category or '',
                'serial_number': self.serial_number or '',
                'product_name': self.product_name or '',
                'note': self.note or '',
                'management_history': self.management_history or [],
                'created_at': str(self.created_at) if self.created_at else ''
            }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Resource':
        """딕셔너리에서 Resource 객체 생성"""
        created_at = data.get('created_at')
        updated_at = data.get('updated_at')
        
        # ISO 형식 문자열을 datetime 객체로 변환
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except:
                created_at = datetime.now()
                
        if isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except:
                updated_at = datetime.now()
        
        return cls(
            id=data.get('id'),
            customer_id=data.get('customer_id'),
            category=data.get('category'),
            serial_number=data.get('serial_number'),
            product_name=data.get('product_name'),
            note=data.get('note'),
            management_history=data.get('management_history', []),
            created_at=created_at,
            updated_at=updated_at
        )
