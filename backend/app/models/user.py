from app.database.init_db import get_db_connection
import bcrypt
from datetime import datetime

class User:
    def __init__(self, id=None, name=None, email=None, password=None, 
                 contact=None, department=None, service_report_access=False,
                 transaction_access=False, customer_access=False, 
                 spare_parts_access=False, spare_parts_edit=True,
                 spare_parts_delete=True, spare_parts_stock_in=True,
                 spare_parts_stock_out=True, is_admin=False):
        self.id = id
        self.name = name
        self.email = email
        self.password = password
        self.contact = contact
        self.department = department
        self.service_report_access = service_report_access
        self.transaction_access = transaction_access
        self.customer_access = customer_access
        self.spare_parts_access = spare_parts_access
        self.spare_parts_edit = spare_parts_edit
        self.spare_parts_delete = spare_parts_delete
        self.spare_parts_stock_in = spare_parts_stock_in
        self.spare_parts_stock_out = spare_parts_stock_out
        self.is_admin = is_admin
    
    @classmethod
    def get_by_email(cls, email):
        """이메일로 사용자 조회"""
        conn = get_db_connection()
        user_data = conn.execute(
            'SELECT * FROM users WHERE email = ?', (email,)
        ).fetchone()
        conn.close()
        
        if user_data:
            return cls(
                id=user_data['id'],
                name=user_data['name'],
                email=user_data['email'],
                password=user_data['password'],
                contact=user_data['contact'],
                department=user_data['department'],
                service_report_access=bool(user_data['service_report_access']),
                transaction_access=bool(user_data['transaction_access']),
                customer_access=bool(user_data['customer_access']),
                spare_parts_access=bool(user_data['spare_parts_access']),
                spare_parts_edit=bool(user_data['spare_parts_edit'] if user_data['spare_parts_edit'] is not None else 1),
                spare_parts_delete=bool(user_data['spare_parts_delete'] if user_data['spare_parts_delete'] is not None else 1),
                spare_parts_stock_in=bool(user_data['spare_parts_stock_in'] if user_data['spare_parts_stock_in'] is not None else 1),
                spare_parts_stock_out=bool(user_data['spare_parts_stock_out'] if user_data['spare_parts_stock_out'] is not None else 1),
                is_admin=bool(user_data['is_admin'])
            )
        return None
    
    @classmethod
    def get_by_id(cls, user_id):
        """ID로 사용자 조회"""
        conn = get_db_connection()
        user_data = conn.execute(
            'SELECT * FROM users WHERE id = ?', (user_id,)
        ).fetchone()
        conn.close()
        
        if user_data:
            return cls(
                id=user_data['id'],
                name=user_data['name'],
                email=user_data['email'],
                password=user_data['password'],
                contact=user_data['contact'],
                department=user_data['department'],
                service_report_access=bool(user_data['service_report_access']),
                transaction_access=bool(user_data['transaction_access']),
                customer_access=bool(user_data['customer_access']),
                spare_parts_access=bool(user_data['spare_parts_access']),
                spare_parts_edit=bool(user_data['spare_parts_edit'] if user_data['spare_parts_edit'] is not None else 1),
                spare_parts_delete=bool(user_data['spare_parts_delete'] if user_data['spare_parts_delete'] is not None else 1),
                spare_parts_stock_in=bool(user_data['spare_parts_stock_in'] if user_data['spare_parts_stock_in'] is not None else 1),
                spare_parts_stock_out=bool(user_data['spare_parts_stock_out'] if user_data['spare_parts_stock_out'] is not None else 1),
                is_admin=bool(user_data['is_admin'])
            )
        return None
    
    def check_password(self, password):
        """비밀번호 확인"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
    
    @classmethod
    def get_all(cls):
        """모든 사용자 조회"""
        conn = get_db_connection()
        users_data = conn.execute(
            'SELECT * FROM users ORDER BY name'
        ).fetchall()
        conn.close()
        
        users = []
        for user_data in users_data:
            users.append(cls(
                id=user_data['id'],
                name=user_data['name'],
                email=user_data['email'],
                contact=user_data['contact'],
                department=user_data['department'],
                service_report_access=bool(user_data['service_report_access']),
                transaction_access=bool(user_data['transaction_access']),
                customer_access=bool(user_data['customer_access']),
                spare_parts_access=bool(user_data['spare_parts_access']),
                spare_parts_edit=bool(user_data['spare_parts_edit'] if user_data['spare_parts_edit'] is not None else 1),
                spare_parts_delete=bool(user_data['spare_parts_delete'] if user_data['spare_parts_delete'] is not None else 1),
                spare_parts_stock_in=bool(user_data['spare_parts_stock_in'] if user_data['spare_parts_stock_in'] is not None else 1),
                spare_parts_stock_out=bool(user_data['spare_parts_stock_out'] if user_data['spare_parts_stock_out'] is not None else 1),
                is_admin=bool(user_data['is_admin'])
            ))
        return users
    
    @classmethod
    def get_by_department(cls, department):
        """부서별 사용자 조회"""
        conn = get_db_connection()
        users_data = conn.execute(
            'SELECT * FROM users WHERE department = ? ORDER BY name',
            (department,)
        ).fetchall()
        conn.close()
        
        users = []
        for user_data in users_data:
            users.append(cls(
                id=user_data['id'],
                name=user_data['name'],
                email=user_data['email'],
                contact=user_data['contact'],
                department=user_data['department'],
                service_report_access=bool(user_data['service_report_access']),
                transaction_access=bool(user_data['transaction_access']),
                customer_access=bool(user_data['customer_access']),
                spare_parts_access=bool(user_data['spare_parts_access']),
                spare_parts_edit=bool(user_data['spare_parts_edit'] if user_data['spare_parts_edit'] is not None else 1),
                spare_parts_delete=bool(user_data['spare_parts_delete'] if user_data['spare_parts_delete'] is not None else 1),
                spare_parts_stock_in=bool(user_data['spare_parts_stock_in'] if user_data['spare_parts_stock_in'] is not None else 1),
                spare_parts_stock_out=bool(user_data['spare_parts_stock_out'] if user_data['spare_parts_stock_out'] is not None else 1),
                is_admin=bool(user_data['is_admin'])
            ))
        return users
    
    def save(self):
        """사용자 정보 저장 (신규 생성 또는 업데이트)"""
        conn = get_db_connection()
        
        if self.id:
            # 업데이트
            conn.execute('''
                UPDATE users SET name=?, email=?, contact=?, department=?,
                               service_report_access=?, transaction_access=?,
                               customer_access=?, spare_parts_access=?, is_admin=?,
                               updated_at=CURRENT_TIMESTAMP
                WHERE id=?
            ''', (self.name, self.email, self.contact, self.department,
                  self.service_report_access, self.transaction_access,
                  self.customer_access, self.spare_parts_access, self.is_admin,
                  self.id))
        else:
            # 신규 생성
            hashed_password = bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt())
            cursor = conn.execute('''
                INSERT INTO users (name, email, password, contact, department,
                                 service_report_access, transaction_access,
                                 customer_access, spare_parts_access, is_admin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (self.name, self.email, hashed_password.decode('utf-8'),
                  self.contact, self.department, self.service_report_access,
                  self.transaction_access, self.customer_access,
                  self.spare_parts_access, self.is_admin))
            self.id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return self.id
    
    def delete(self):
        """사용자 삭제"""
        if self.id:
            conn = get_db_connection()
            conn.execute('DELETE FROM users WHERE id = ?', (self.id,))
            conn.commit()
            conn.close()
            return True
        return False
    
    def update_password(self, new_password):
        """비밀번호 업데이트"""
        if self.id:
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            conn = get_db_connection()
            conn.execute(
                'UPDATE users SET password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                (hashed_password.decode('utf-8'), self.id)
            )
            conn.commit()
            conn.close()
            return True
        return False
    
    def to_dict(self):
        """딕셔너리로 변환 (비밀번호 제외)"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'contact': self.contact,
            'department': self.department,
            'service_report_access': self.service_report_access,
            'transaction_access': self.transaction_access,
            'customer_access': self.customer_access,
            'spare_parts_access': self.spare_parts_access,
            'spare_parts_edit': self.spare_parts_edit if self.spare_parts_edit is not None else False,
            'spare_parts_delete': self.spare_parts_delete if self.spare_parts_delete is not None else False,
            'spare_parts_stock_in': self.spare_parts_stock_in if self.spare_parts_stock_in is not None else False,
            'spare_parts_stock_out': self.spare_parts_stock_out if self.spare_parts_stock_out is not None else False,
            'is_admin': self.is_admin
        }