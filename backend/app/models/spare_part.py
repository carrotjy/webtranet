from app.database.init_db import get_db_connection
from datetime import datetime

class SparePart:
    def __init__(self, id=None, part_number=None, part_name=None,
                 description=None, price=0, stock_quantity=0, minimum_stock=0,
                 supplier=None, created_at=None, updated_at=None):
        self.id = id
        self.part_number = part_number
        self.part_name = part_name
        self.description = description
        self.price = price
        self.stock_quantity = stock_quantity
        self.minimum_stock = minimum_stock
        self.supplier = supplier
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_all(cls, page=1, per_page=10):
        """모든 스페어파트 조회 (페이징)"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        parts_data = conn.execute('''
            SELECT * FROM spare_parts 
            ORDER BY part_number ASC
            LIMIT ? OFFSET ?
        ''', (per_page, offset)).fetchall()
        
        total = conn.execute('SELECT COUNT(*) FROM spare_parts').fetchone()[0]
        conn.close()
        
        parts = [cls._from_db_row(data) for data in parts_data]
        return parts, total
    
    @classmethod
    def get_by_id(cls, part_id):
        """ID로 스페어파트 조회"""
        conn = get_db_connection()
        data = conn.execute(
            'SELECT * FROM spare_parts WHERE id = ?', (part_id,)
        ).fetchone()
        conn.close()
        
        if data:
            return cls._from_db_row(data)
        return None
    
    @classmethod
    def get_by_part_number(cls, part_number):
        """부품 번호로 스페어파트 조회"""
        conn = get_db_connection()
        data = conn.execute(
            'SELECT * FROM spare_parts WHERE part_number = ?', (part_number,)
        ).fetchone()
        conn.close()
        
        if data:
            return cls._from_db_row(data)
        return None
    
    @classmethod
    def search(cls, keyword=None, low_stock_only=False, page=1, per_page=10):
        """스페어파트 검색"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        query = 'SELECT * FROM spare_parts WHERE 1=1'
        params = []
        
        if keyword:
            query += ''' AND (part_number LIKE ? OR part_name LIKE ? 
                           OR description LIKE ? OR supplier LIKE ?)'''
            keyword_param = f'%{keyword}%'
            params.extend([keyword_param] * 4)
        
        if low_stock_only:
            query += ' AND stock_quantity <= minimum_stock'
        
        query += ' ORDER BY part_number ASC LIMIT ? OFFSET ?'
        params.extend([per_page, offset])
        
        parts_data = conn.execute(query, params).fetchall()
        
        # 총 개수 조회
        count_query = query.replace('SELECT *', 'SELECT COUNT(*)')
        count_query = count_query.replace('ORDER BY part_number ASC LIMIT ? OFFSET ?', '')
        count_params = params[:-2]  # LIMIT, OFFSET 제외
        total = conn.execute(count_query, count_params).fetchone()[0]
        
        conn.close()
        
        parts = [cls._from_db_row(data) for data in parts_data]
        return parts, total
    
    @classmethod
    def get_low_stock_parts(cls):
        """재고 부족 부품 조회"""
        conn = get_db_connection()
        parts_data = conn.execute('''
            SELECT * FROM spare_parts 
            WHERE stock_quantity <= minimum_stock
            ORDER BY part_number ASC
        ''').fetchall()
        conn.close()
        
        return [cls._from_db_row(data) for data in parts_data]
    
    def save(self):
        """스페어파트 저장 (생성 또는 수정)"""
        conn = get_db_connection()
        
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE spare_parts SET 
                    part_number=?, part_name=?, description=?, price=?,
                    stock_quantity=?, minimum_stock=?, supplier=?,
                    updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (self.part_number, self.part_name, self.description,
                      self.price, self.stock_quantity, self.minimum_stock,
                      self.supplier, self.id))
            else:
                # 신규 생성 - 부품 번호 중복 확인
                existing = conn.execute(
                    'SELECT id FROM spare_parts WHERE part_number = ?',
                    (self.part_number,)
                ).fetchone()
                
                if existing:
                    raise Exception(f'부품 번호 {self.part_number}는 이미 존재합니다.')
                
                cursor = conn.execute('''
                    INSERT INTO spare_parts 
                    (part_number, part_name, description, price,
                     stock_quantity, minimum_stock, supplier)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (self.part_number, self.part_name, self.description,
                      self.price, self.stock_quantity, self.minimum_stock,
                      self.supplier))
                self.id = cursor.lastrowid
            
            conn.commit()
            return self.id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def delete(self):
        """스페어파트 삭제"""
        if self.id:
            conn = get_db_connection()
            try:
                conn.execute('DELETE FROM spare_parts WHERE id = ?', (self.id,))
                conn.commit()
                return True
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
        return False
    
    def update_stock(self, quantity_change, operation='add'):
        """재고 수량 업데이트"""
        if self.id:
            conn = get_db_connection()
            try:
                if operation == 'add':
                    new_quantity = self.stock_quantity + quantity_change
                elif operation == 'subtract':
                    new_quantity = self.stock_quantity - quantity_change
                    if new_quantity < 0:
                        raise Exception('재고 수량이 부족합니다.')
                else:
                    new_quantity = quantity_change
                
                conn.execute('''
                    UPDATE spare_parts SET 
                    stock_quantity=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (new_quantity, self.id))
                
                conn.commit()
                self.stock_quantity = new_quantity
                return True
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
        return False
    
    def is_low_stock(self):
        """재고 부족 여부 확인"""
        return self.stock_quantity <= self.minimum_stock
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            part_number=row['part_number'],
            part_name=row['part_name'],
            description=row['description'],
            price=row['price'],
            stock_quantity=row['stock_quantity'],
            minimum_stock=row['minimum_stock'],
            supplier=row['supplier'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'part_number': self.part_number,
            'part_name': self.part_name,
            'description': self.description,
            'price': self.price,
            'stock_quantity': self.stock_quantity,
            'minimum_stock': self.minimum_stock,
            'supplier': self.supplier,
            'is_low_stock': self.is_low_stock(),
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }