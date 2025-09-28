from app.database.init_db import get_db_connection
from datetime import datetime

class Customer:
    def __init__(self, id=None, company_name=None, contact_person=None,
                 email=None, phone=None, address=None, notes=None,
                 postal_code=None, tel=None, fax=None, president=None,
                 mobile=None, contact=None, created_at=None, updated_at=None):
        
        # None 값을 빈 문자열로 안전하게 변환하는 헬퍼 함수
        def safe_str(value):
            if value is None or value == 'NONE':
                return ''
            return str(value) if value is not None else ''
        
        self.id = id
        self.company_name = safe_str(company_name)
        self.contact_person = safe_str(contact_person)
        self.email = safe_str(email)
        self.phone = safe_str(phone)
        self.address = safe_str(address)
        self.notes = safe_str(notes)
        self.postal_code = safe_str(postal_code)
        self.tel = safe_str(tel)
        self.fax = safe_str(fax)
        self.president = safe_str(president)
        self.mobile = safe_str(mobile)
        self.contact = safe_str(contact)
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_all(cls, page=1, per_page=10):
        """모든 고객 정보 조회 (페이징)"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        customers_data = conn.execute('''
            SELECT * FROM customers 
            ORDER BY company_name ASC
            LIMIT ? OFFSET ?
        ''', (per_page, offset)).fetchall()
        
        total = conn.execute('SELECT COUNT(*) FROM customers').fetchone()[0]
        conn.close()
        
        customers = [cls._from_db_row(data) for data in customers_data]
        return customers, total
    
    @classmethod
    def get_by_id(cls, customer_id):
        """ID로 고객 정보 조회"""
        conn = get_db_connection()
        data = conn.execute(
            'SELECT * FROM customers WHERE id = ?', (customer_id,)
        ).fetchone()
        conn.close()
        
        if data:
            return cls._from_db_row(data)
        return None
    
    @classmethod
    def get_by_company_name(cls, company_name):
        """회사명으로 고객 정보 조회"""
        conn = get_db_connection()
        data = conn.execute(
            'SELECT * FROM customers WHERE company_name = ?', (company_name,)
        ).fetchone()
        conn.close()
        
        if data:
            return cls._from_db_row(data)
        return None
    
    @classmethod
    def search(cls, keyword=None, page=1, per_page=10):
        """고객 정보 검색"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        if keyword:
            query = '''
                SELECT * FROM customers 
                WHERE company_name LIKE ? OR contact_person LIKE ? 
                   OR email LIKE ? OR phone LIKE ? OR address LIKE ?
                ORDER BY company_name ASC
                LIMIT ? OFFSET ?
            '''
            keyword_param = f'%{keyword}%'
            params = [keyword_param] * 5 + [per_page, offset]
            
            customers_data = conn.execute(query, params).fetchall()
            
            count_query = '''
                SELECT COUNT(*) FROM customers 
                WHERE company_name LIKE ? OR contact_person LIKE ? 
                   OR email LIKE ? OR phone LIKE ? OR address LIKE ?
            '''
            total = conn.execute(count_query, [keyword_param] * 5).fetchone()[0]
        else:
            customers_data = conn.execute('''
                SELECT * FROM customers 
                ORDER BY company_name ASC
                LIMIT ? OFFSET ?
            ''', (per_page, offset)).fetchall()
            
            total = conn.execute('SELECT COUNT(*) FROM customers').fetchone()[0]
        
        conn.close()
        
        customers = [cls._from_db_row(data) for data in customers_data]
        return customers, total
    
    def save(self):
        """고객 정보 저장 (생성 또는 수정)"""
        conn = get_db_connection()
        
        # None 값을 빈 문자열로 변환하는 헬퍼 함수
        def safe_value(value):
            return value if value is not None else ''
        
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE customers SET 
                    company_name=?, contact_person=?, email=?, phone=?,
                    address=?, postal_code=?, tel=?, fax=?, president=?,
                    mobile=?, contact=?, notes=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (safe_value(self.company_name), safe_value(self.contact_person), 
                      safe_value(self.email), safe_value(self.phone), safe_value(self.address), 
                      safe_value(self.postal_code), safe_value(self.tel), safe_value(self.fax),
                      safe_value(self.president), safe_value(self.mobile), safe_value(self.contact),
                      safe_value(self.notes), self.id))
            else:
                # 신규 생성
                cursor = conn.execute('''
                    INSERT INTO customers 
                    (company_name, contact_person, email, phone, address, 
                     postal_code, tel, fax, president, mobile, contact, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (safe_value(self.company_name), safe_value(self.contact_person), 
                      safe_value(self.email), safe_value(self.phone), safe_value(self.address),
                      safe_value(self.postal_code), safe_value(self.tel), safe_value(self.fax),
                      safe_value(self.president), safe_value(self.mobile), safe_value(self.contact),
                      safe_value(self.notes)))
                self.id = cursor.lastrowid
            
            conn.commit()
            return self.id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def update(self):
        """고객 정보 업데이트"""
        if not self.id:
            return False
        
        conn = get_db_connection()
        
        # None 값을 빈 문자열로 변환하는 헬퍼 함수
        def safe_value(value):
            return value if value is not None else ''
        
        try:
            conn.execute('''
                UPDATE customers SET 
                company_name=?, contact_person=?, email=?, phone=?,
                address=?, postal_code=?, tel=?, fax=?, president=?,
                mobile=?, contact=?, notes=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
            ''', (safe_value(self.company_name), safe_value(self.contact_person), 
                  safe_value(self.email), safe_value(self.phone), safe_value(self.address),
                  safe_value(self.postal_code), safe_value(self.tel), safe_value(self.fax),
                  safe_value(self.president), safe_value(self.mobile), safe_value(self.contact),
                  safe_value(self.notes), self.id))
            
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def delete(self):
        """고객 정보 삭제"""
        if self.id:
            conn = get_db_connection()
            try:
                # 관련된 서비스 리포트가 있는지 확인
                service_reports = conn.execute(
                    'SELECT COUNT(*) FROM service_reports WHERE customer_id = ?',
                    (self.id,)
                ).fetchone()[0]
                
                if service_reports > 0:
                    raise Exception('이 고객과 연관된 서비스 리포트가 있어 삭제할 수 없습니다.')
                
                conn.execute('DELETE FROM customers WHERE id = ?', (self.id,))
                conn.commit()
                return True
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
        return False
    
    def get_service_reports_count(self):
        """해당 고객의 서비스 리포트 수 조회"""
        if self.id:
            conn = get_db_connection()
            count = conn.execute(
                'SELECT COUNT(*) FROM service_reports WHERE customer_id = ?',
                (self.id,)
            ).fetchone()[0]
            conn.close()
            return count
        return 0
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        def safe_get(row, key):
            """SQLite Row에서 안전하게 값 가져오기"""
            try:
                return row[key] if key in row.keys() else None
            except Exception as e:
                print(f"[WARNING] Error accessing column '{key}': {e}")
                return None
        
        try:
            return cls(
                id=safe_get(row, 'id'),
                company_name=safe_get(row, 'company_name'),
                contact_person=safe_get(row, 'contact_person'),
                email=safe_get(row, 'email'),
                phone=safe_get(row, 'phone'),
                address=safe_get(row, 'address'),
                postal_code=safe_get(row, 'postal_code'),
                tel=safe_get(row, 'tel'),
                fax=safe_get(row, 'fax'),
                president=safe_get(row, 'president'),
                mobile=safe_get(row, 'mobile'),
                contact=safe_get(row, 'contact'),
                notes=safe_get(row, 'notes'),
                created_at=safe_get(row, 'created_at'),
                updated_at=safe_get(row, 'updated_at')
            )
        except Exception as e:
            print(f"[ERROR] Failed to create Customer from DB row: {e}")
            print(f"[ERROR] Row keys: {list(row.keys()) if hasattr(row, 'keys') else 'No keys method'}")
            raise
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'company_name': self.company_name,
            'contact_person': self.contact_person,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'postal_code': self.postal_code,
            'tel': self.tel,
            'fax': self.fax,
            'president': self.president,
            'mobile': self.mobile,
            'contact': self.contact,
            'notes': self.notes,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'service_reports_count': self.get_service_reports_count() if self.id else 0
        }