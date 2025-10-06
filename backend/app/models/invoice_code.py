from app.database.init_db import get_db_connection
from datetime import datetime

class InvoiceCode:
    def __init__(self, id=None, code=None, description=None, category=None,
                 created_at=None, updated_at=None):
        self.id = id
        self.code = code
        self.description = description
        self.category = category
        self.created_at = created_at
        self.updated_at = updated_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'description': self.description,
            'category': self.category,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def __repr__(self):
        return f'<InvoiceCode {self.code}: {self.description}>'
    
    @classmethod
    def get_all_codes(cls):
        """모든 Invoice 코드들 반환"""
        conn = get_db_connection()
        try:
            codes_data = conn.execute('''
                SELECT * FROM invoice_codes 
                ORDER BY code
            ''').fetchall()
            
            codes = []
            for data in codes_data:
                codes.append(cls._from_db_row(data))
            return codes
        finally:
            conn.close()
    
    @classmethod
    def get_by_id(cls, code_id):
        """ID로 Invoice 코드 조회"""
        conn = get_db_connection()
        try:
            data = conn.execute('''
                SELECT * FROM invoice_codes 
                WHERE id = ?
            ''', (code_id,)).fetchone()
            
            if data:
                return cls._from_db_row(data)
            return None
        finally:
            conn.close()
    
    @classmethod
    def get_by_code(cls, code):
        """코드로 Invoice 코드 조회"""
        conn = get_db_connection()
        try:
            data = conn.execute('''
                SELECT * FROM invoice_codes 
                WHERE code = ?
            ''', (code,)).fetchone()
            
            if data:
                return cls._from_db_row(data)
            return None
        finally:
            conn.close()
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            code=row['code'],
            description=row['description'],
            category=row['category'] if 'category' in row else None,
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def save(self):
        """Invoice 코드 저장 (생성 또는 수정)"""
        conn = get_db_connection()
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE invoice_codes SET 
                    code=?, description=?, category=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (self.code, self.description, self.category, self.id))
            else:
                # 신규 생성
                cursor = conn.execute('''
                    INSERT INTO invoice_codes (code, description, category)
                    VALUES (?, ?, ?)
                ''', (self.code, self.description, self.category))
                self.id = cursor.lastrowid
            
            conn.commit()
            return self.id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    @staticmethod
    def delete(invoice_code_id):
        """Invoice 코드 삭제 (실제 삭제)"""
        conn = get_db_connection()
        try:
            # 서비스 리포트에서 사용 중인지 확인
            usage_count = conn.execute('''
                SELECT COUNT(*) as count FROM service_reports 
                WHERE invoice_code_id = ?
            ''', (invoice_code_id,)).fetchone()
            
            if usage_count['count'] > 0:
                raise ValueError(f"이 Invoice 코드는 {usage_count['count']}개의 서비스 리포트에서 사용 중이므로 삭제할 수 없습니다.")
            
            # 실제 삭제
            conn.execute('DELETE FROM invoice_codes WHERE id=?', (invoice_code_id,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()