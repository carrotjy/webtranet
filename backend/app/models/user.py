from app.database.init_db import get_db_connection
import bcrypt
from datetime import datetime

class User:
    def __init__(self, id=None, name=None, email=None, password=None, 
                 contact=None, department=None, service_report_access=False,
                 transaction_access=False, customer_access=False, 
                 spare_parts_access=False, resource_access=False,
                 spare_parts_edit=True, 
                 spare_parts_delete=True, spare_parts_stock_in=True, 
                 spare_parts_stock_out=True, is_admin=False,
                 created_at=None,
                 # 서비스 리포트 CRUD 권한
                 service_report_create=False, service_report_read=False,
                 service_report_update=False, service_report_delete=False,
                 # 리소스 CRUD 권한
                 resource_create=False, resource_read=False,
                 resource_update=False, resource_delete=False,
                 # 고객정보 CRUD 권한
                 customer_create=False, customer_read=False,
                 customer_update=False, customer_delete=False,
                 # 거래명세서 CRUD 권한
                 transaction_create=False, transaction_read=False,
                 transaction_update=False, transaction_delete=False,
                 # 부품 CRUD 권한
                 spare_parts_create=False, spare_parts_read=False,
                 spare_parts_update=False, spare_parts_delete_crud=False):
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
        self.resource_access = resource_access
        self.spare_parts_edit = spare_parts_edit
        self.spare_parts_delete = spare_parts_delete
        self.spare_parts_stock_in = spare_parts_stock_in
        self.spare_parts_stock_out = spare_parts_stock_out
        self.is_admin = is_admin
        self.created_at = created_at if created_at else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        # 서비스 리포트 CRUD 권한
        self.service_report_create = service_report_create
        self.service_report_read = service_report_read
        self.service_report_update = service_report_update
        self.service_report_delete = service_report_delete
        # 리소스 CRUD 권한
        self.resource_create = resource_create
        self.resource_read = resource_read
        self.resource_update = resource_update
        self.resource_delete = resource_delete
        # 고객정보 CRUD 권한
        self.customer_create = customer_create
        self.customer_read = customer_read
        self.customer_update = customer_update
        self.customer_delete = customer_delete
        # 거래명세서 CRUD 권한
        self.transaction_create = transaction_create
        self.transaction_read = transaction_read
        self.transaction_update = transaction_update
        self.transaction_delete = transaction_delete
        # 부품 CRUD 권한
        self.spare_parts_create = spare_parts_create
        self.spare_parts_read = spare_parts_read
        self.spare_parts_update = spare_parts_update
        self.spare_parts_delete_crud = spare_parts_delete_crud
    
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
                is_admin=bool(user_data['is_admin']),
                # 서비스 리포트 CRUD 권한
                service_report_create=bool(user_data['service_report_create'] if user_data['service_report_create'] is not None else 0),
                service_report_read=bool(user_data['service_report_read'] if user_data['service_report_read'] is not None else 0),
                service_report_update=bool(user_data['service_report_update'] if user_data['service_report_update'] is not None else 0),
                service_report_delete=bool(user_data['service_report_delete'] if user_data['service_report_delete'] is not None else 0),
                # 리소스 CRUD 권한
                resource_create=bool(user_data['resource_create'] if user_data['resource_create'] is not None else 0),
                resource_read=bool(user_data['resource_read'] if user_data['resource_read'] is not None else 0),
                resource_update=bool(user_data['resource_update'] if user_data['resource_update'] is not None else 0),
                resource_delete=bool(user_data['resource_delete'] if user_data['resource_delete'] is not None else 0),
                # 고객정보 CRUD 권한
                customer_create=bool(user_data['customer_create'] if user_data['customer_create'] is not None else 0),
                customer_read=bool(user_data['customer_read'] if user_data['customer_read'] is not None else 0),
                customer_update=bool(user_data['customer_update'] if user_data['customer_update'] is not None else 0),
                customer_delete=bool(user_data['customer_delete'] if user_data['customer_delete'] is not None else 0),
                created_at=user_data['created_at']
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
                resource_access=bool(user_data['resource_access'] or 0),
                spare_parts_edit=bool(user_data['spare_parts_edit'] if user_data['spare_parts_edit'] is not None else 1),
                spare_parts_delete=bool(user_data['spare_parts_delete'] if user_data['spare_parts_delete'] is not None else 1),
                spare_parts_stock_in=bool(user_data['spare_parts_stock_in'] if user_data['spare_parts_stock_in'] is not None else 1),
                spare_parts_stock_out=bool(user_data['spare_parts_stock_out'] if user_data['spare_parts_stock_out'] is not None else 1),
                is_admin=bool(user_data['is_admin']),
                # 서비스 리포트 CRUD 권한
                service_report_create=bool(user_data['service_report_create'] if user_data['service_report_create'] is not None else 0),
                service_report_read=bool(user_data['service_report_read'] if user_data['service_report_read'] is not None else 0),
                service_report_update=bool(user_data['service_report_update'] if user_data['service_report_update'] is not None else 0),
                service_report_delete=bool(user_data['service_report_delete'] if user_data['service_report_delete'] is not None else 0),
                # 리소스 CRUD 권한
                resource_create=bool(user_data['resource_create'] if user_data['resource_create'] is not None else 0),
                resource_read=bool(user_data['resource_read'] if user_data['resource_read'] is not None else 0),
                resource_update=bool(user_data['resource_update'] if user_data['resource_update'] is not None else 0),
                resource_delete=bool(user_data['resource_delete'] if user_data['resource_delete'] is not None else 0),
                # 고객정보 CRUD 권한
                customer_create=bool(user_data['customer_create'] if user_data['customer_create'] is not None else 0),
                customer_read=bool(user_data['customer_read'] if user_data['customer_read'] is not None else 0),
                customer_update=bool(user_data['customer_update'] if user_data['customer_update'] is not None else 0),
                customer_delete=bool(user_data['customer_delete'] if user_data['customer_delete'] is not None else 0),
                # 트랜잭션 CRUD 권한
                transaction_create=bool(user_data['transaction_create'] if user_data['transaction_create'] is not None else 0),
                transaction_read=bool(user_data['transaction_read'] if user_data['transaction_read'] is not None else 0),
                transaction_update=bool(user_data['transaction_update'] if user_data['transaction_update'] is not None else 0),
                transaction_delete=bool(user_data['transaction_delete'] if user_data['transaction_delete'] is not None else 0),
                # 스페어파츠 CRUD 권한
                spare_parts_create=bool(user_data['spare_parts_create'] if user_data['spare_parts_create'] is not None else 0),
                spare_parts_read=bool(user_data['spare_parts_read'] if user_data['spare_parts_read'] is not None else 0),
                spare_parts_update=bool(user_data['spare_parts_update'] if user_data['spare_parts_update'] is not None else 0),
                spare_parts_delete_crud=bool(user_data['spare_parts_delete_crud'] if user_data['spare_parts_delete_crud'] is not None else 0),
                created_at=user_data['created_at']
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
                resource_access=bool(user_data['resource_access'] or 0),
                spare_parts_edit=bool(user_data['spare_parts_edit'] if user_data['spare_parts_edit'] is not None else 1),
                spare_parts_delete=bool(user_data['spare_parts_delete'] if user_data['spare_parts_delete'] is not None else 1),
                spare_parts_stock_in=bool(user_data['spare_parts_stock_in'] if user_data['spare_parts_stock_in'] is not None else 1),
                spare_parts_stock_out=bool(user_data['spare_parts_stock_out'] if user_data['spare_parts_stock_out'] is not None else 1),
                is_admin=bool(user_data['is_admin']),
                # 서비스 리포트 CRUD 권한
                service_report_create=bool(user_data['service_report_create'] if user_data['service_report_create'] is not None else 0),
                service_report_read=bool(user_data['service_report_read'] if user_data['service_report_read'] is not None else 0),
                service_report_update=bool(user_data['service_report_update'] if user_data['service_report_update'] is not None else 0),
                service_report_delete=bool(user_data['service_report_delete'] if user_data['service_report_delete'] is not None else 0),
                # 리소스 CRUD 권한
                resource_create=bool(user_data['resource_create'] if user_data['resource_create'] is not None else 0),
                resource_read=bool(user_data['resource_read'] if user_data['resource_read'] is not None else 0),
                resource_update=bool(user_data['resource_update'] if user_data['resource_update'] is not None else 0),
                resource_delete=bool(user_data['resource_delete'] if user_data['resource_delete'] is not None else 0),
                # 고객정보 CRUD 권한
                customer_create=bool(user_data['customer_create'] if user_data['customer_create'] is not None else 0),
                customer_read=bool(user_data['customer_read'] if user_data['customer_read'] is not None else 0),
                customer_update=bool(user_data['customer_update'] if user_data['customer_update'] is not None else 0),
                customer_delete=bool(user_data['customer_delete'] if user_data['customer_delete'] is not None else 0),
                # 트랜잭션 CRUD 권한
                transaction_create=bool(user_data['transaction_create'] if user_data['transaction_create'] is not None else 0),
                transaction_read=bool(user_data['transaction_read'] if user_data['transaction_read'] is not None else 0),
                transaction_update=bool(user_data['transaction_update'] if user_data['transaction_update'] is not None else 0),
                transaction_delete=bool(user_data['transaction_delete'] if user_data['transaction_delete'] is not None else 0),
                # 스페어파츠 CRUD 권한
                spare_parts_create=bool(user_data['spare_parts_create'] if user_data['spare_parts_create'] is not None else 0),
                spare_parts_read=bool(user_data['spare_parts_read'] if user_data['spare_parts_read'] is not None else 0),
                spare_parts_update=bool(user_data['spare_parts_update'] if user_data['spare_parts_update'] is not None else 0),
                spare_parts_delete_crud=bool(user_data['spare_parts_delete_crud'] if user_data['spare_parts_delete_crud'] is not None else 0),
                created_at=user_data['created_at']
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
                resource_access=bool(user_data['resource_access'] or 0),
                spare_parts_edit=bool(user_data['spare_parts_edit'] if user_data['spare_parts_edit'] is not None else 1),
                spare_parts_delete=bool(user_data['spare_parts_delete'] if user_data['spare_parts_delete'] is not None else 1),
                spare_parts_stock_in=bool(user_data['spare_parts_stock_in'] if user_data['spare_parts_stock_in'] is not None else 1),
                spare_parts_stock_out=bool(user_data['spare_parts_stock_out'] if user_data['spare_parts_stock_out'] is not None else 1),
                is_admin=bool(user_data['is_admin']),
                # 서비스 리포트 CRUD 권한
                service_report_create=bool(user_data['service_report_create'] if user_data['service_report_create'] is not None else 0),
                service_report_read=bool(user_data['service_report_read'] if user_data['service_report_read'] is not None else 0),
                service_report_update=bool(user_data['service_report_update'] if user_data['service_report_update'] is not None else 0),
                service_report_delete=bool(user_data['service_report_delete'] if user_data['service_report_delete'] is not None else 0),
                # 리소스 CRUD 권한
                resource_create=bool(user_data['resource_create'] if user_data['resource_create'] is not None else 0),
                resource_read=bool(user_data['resource_read'] if user_data['resource_read'] is not None else 0),
                resource_update=bool(user_data['resource_update'] if user_data['resource_update'] is not None else 0),
                resource_delete=bool(user_data['resource_delete'] if user_data['resource_delete'] is not None else 0),
                # 고객정보 CRUD 권한
                customer_create=bool(user_data['customer_create'] if user_data['customer_create'] is not None else 0),
                customer_read=bool(user_data['customer_read'] if user_data['customer_read'] is not None else 0),
                customer_update=bool(user_data['customer_update'] if user_data['customer_update'] is not None else 0),
                customer_delete=bool(user_data['customer_delete'] if user_data['customer_delete'] is not None else 0),
                # 트랜잭션 CRUD 권한
                transaction_create=bool(user_data['transaction_create'] if user_data['transaction_create'] is not None else 0),
                transaction_read=bool(user_data['transaction_read'] if user_data['transaction_read'] is not None else 0),
                transaction_update=bool(user_data['transaction_update'] if user_data['transaction_update'] is not None else 0),
                transaction_delete=bool(user_data['transaction_delete'] if user_data['transaction_delete'] is not None else 0),
                # 스페어파츠 CRUD 권한
                spare_parts_create=bool(user_data['spare_parts_create'] if user_data['spare_parts_create'] is not None else 0),
                spare_parts_read=bool(user_data['spare_parts_read'] if user_data['spare_parts_read'] is not None else 0),
                spare_parts_update=bool(user_data['spare_parts_update'] if user_data['spare_parts_update'] is not None else 0),
                spare_parts_delete_crud=bool(user_data['spare_parts_delete_crud'] if user_data['spare_parts_delete_crud'] is not None else 0),
                created_at=user_data['created_at']
            ))
        return users
    
    def save(self):
        """사용자 정보 저장 (신규 생성 또는 업데이트)"""
        try:
            conn = get_db_connection()
        
            if self.id:
                # 업데이트 - 비밀번호 포함 여부에 따라 다른 쿼리 사용
                if hasattr(self, 'password') and self.password:
                    # 비밀번호가 설정된 경우 해싱 후 업데이트
                    hashed_password = bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt())
                    conn.execute('''
                    UPDATE users SET name=?, email=?, password=?, contact=?, department=?,
                                   service_report_access=?, transaction_access=?,
                                   customer_access=?, spare_parts_access=?, 
                                   resource_access=?, is_admin=?,
                                   service_report_create=?, service_report_read=?, 
                                   service_report_update=?, service_report_delete=?,
                                   resource_create=?, resource_read=?, 
                                   resource_update=?, resource_delete=?,
                                   customer_create=?, customer_read=?, 
                                   customer_update=?, customer_delete=?,
                                   transaction_create=?, transaction_read=?, 
                                   transaction_update=?, transaction_delete=?,
                                   spare_parts_create=?, spare_parts_read=?, 
                                   spare_parts_update=?, spare_parts_delete_crud=?,
                                   updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                    ''', (self.name, self.email, hashed_password.decode('utf-8'), self.contact, self.department,
                          self.service_report_access, self.transaction_access,
                          self.customer_access, self.spare_parts_access, 
                          getattr(self, 'resource_access', False), self.is_admin,
                          # 서비스 리포트 CRUD 권한
                          getattr(self, 'service_report_create', False),
                          getattr(self, 'service_report_read', False),
                          getattr(self, 'service_report_update', False),
                          getattr(self, 'service_report_delete', False),
                          # 리소스 CRUD 권한
                          getattr(self, 'resource_create', False),
                          getattr(self, 'resource_read', False),
                          getattr(self, 'resource_update', False),
                          getattr(self, 'resource_delete', False),
                          # 고객정보 CRUD 권한
                          getattr(self, 'customer_create', False),
                          getattr(self, 'customer_read', False),
                          getattr(self, 'customer_update', False),
                          getattr(self, 'customer_delete', False),
                          # 거래명세서 CRUD 권한
                          getattr(self, 'transaction_create', False),
                          getattr(self, 'transaction_read', False),
                          getattr(self, 'transaction_update', False),
                          getattr(self, 'transaction_delete', False),
                          # 부품 CRUD 권한
                          getattr(self, 'spare_parts_create', False),
                          getattr(self, 'spare_parts_read', False),
                          getattr(self, 'spare_parts_update', False),
                          getattr(self, 'spare_parts_delete_crud', False),
                          self.id))
                else:
                    # 비밀번호 변경이 없는 경우 기존 쿼리 사용
                    conn.execute('''
                    UPDATE users SET name=?, email=?, contact=?, department=?,
                                   service_report_access=?, transaction_access=?,
                                   customer_access=?, spare_parts_access=?, 
                                   resource_access=?, is_admin=?,
                                   service_report_create=?, service_report_read=?, 
                                   service_report_update=?, service_report_delete=?,
                                   resource_create=?, resource_read=?, 
                                   resource_update=?, resource_delete=?,
                                   customer_create=?, customer_read=?, 
                                   customer_update=?, customer_delete=?,
                                   transaction_create=?, transaction_read=?, 
                                   transaction_update=?, transaction_delete=?,
                                   spare_parts_create=?, spare_parts_read=?, 
                                   spare_parts_update=?, spare_parts_delete_crud=?,
                                   updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                    ''', (self.name, self.email, self.contact, self.department,
                          self.service_report_access, self.transaction_access,
                          self.customer_access, self.spare_parts_access, 
                          getattr(self, 'resource_access', False), self.is_admin,
                          # 서비스 리포트 CRUD 권한
                          getattr(self, 'service_report_create', False),
                          getattr(self, 'service_report_read', False),
                          getattr(self, 'service_report_update', False),
                          getattr(self, 'service_report_delete', False),
                          # 리소스 CRUD 권한
                          getattr(self, 'resource_create', False),
                          getattr(self, 'resource_read', False),
                          getattr(self, 'resource_update', False),
                          getattr(self, 'resource_delete', False),
                          # 고객정보 CRUD 권한
                          getattr(self, 'customer_create', False),
                          getattr(self, 'customer_read', False),
                          getattr(self, 'customer_update', False),
                          getattr(self, 'customer_delete', False),
                          # 거래명세서 CRUD 권한
                          getattr(self, 'transaction_create', False),
                          getattr(self, 'transaction_read', False),
                          getattr(self, 'transaction_update', False),
                          getattr(self, 'transaction_delete', False),
                          # 부품 CRUD 권한
                          getattr(self, 'spare_parts_create', False),
                          getattr(self, 'spare_parts_read', False),
                          getattr(self, 'spare_parts_update', False),
                          getattr(self, 'spare_parts_delete_crud', False),
                          self.id))
            else:
                # 신규 생성
                hashed_password = bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt())
                cursor = conn.execute('''
                INSERT INTO users (name, email, password, contact, department,
                                 service_report_access, transaction_access,
                                 customer_access, spare_parts_access, 
                                 resource_access, is_admin, created_at, updated_at, role,
                                 spare_parts_edit, spare_parts_delete, 
                                 spare_parts_stock_in, spare_parts_stock_out,
                                 service_report_create, service_report_read,
                                 service_report_update, service_report_delete,
                                 resource_create, resource_read,
                                 resource_update, resource_delete,
                                 customer_create, customer_read,
                                 customer_update, customer_delete,
                                 transaction_create, transaction_read,
                                 transaction_update, transaction_delete,
                                 spare_parts_create, spare_parts_read,
                                 spare_parts_update, spare_parts_delete_crud)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (self.name, self.email, hashed_password.decode('utf-8'),
                      self.contact, self.department, self.service_report_access,
                      self.transaction_access, self.customer_access,
                      self.spare_parts_access, getattr(self, 'resource_access', False), 
                      self.is_admin, '사용자',  # role
                      # spare_parts 기존 권한들
                      getattr(self, 'spare_parts_edit', True),
                      getattr(self, 'spare_parts_delete', True),
                      getattr(self, 'spare_parts_stock_in', True), 
                      getattr(self, 'spare_parts_stock_out', True),
                      # 서비스 리포트 CRUD 권한
                      getattr(self, 'service_report_create', False),
                      getattr(self, 'service_report_read', False),
                      getattr(self, 'service_report_update', False),
                      getattr(self, 'service_report_delete', False),
                      # 리소스 CRUD 권한
                      getattr(self, 'resource_create', False),
                      getattr(self, 'resource_read', False),
                      getattr(self, 'resource_update', False),
                      getattr(self, 'resource_delete', False),
                      # 고객정보 CRUD 권한
                      getattr(self, 'customer_create', False),
                      getattr(self, 'customer_read', False),
                      getattr(self, 'customer_update', False),
                      getattr(self, 'customer_delete', False),
                      # 거래명세서 CRUD 권한
                      getattr(self, 'transaction_create', False),
                      getattr(self, 'transaction_read', False),
                      getattr(self, 'transaction_update', False),
                      getattr(self, 'transaction_delete', False),
                      # 부품 CRUD 권한
                      getattr(self, 'spare_parts_create', False),
                      getattr(self, 'spare_parts_read', False),
                      getattr(self, 'spare_parts_update', False),
                      getattr(self, 'spare_parts_delete_crud', False)))
                self.id = cursor.lastrowid
        
            conn.commit()
            conn.close()
            return self.id
        except Exception as e:
            print(f"User save 오류: {str(e)}")
            import traceback
            traceback.print_exc()
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            return None
    
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
            'resource_access': getattr(self, 'resource_access', False),
            'spare_parts_edit': self.spare_parts_edit if self.spare_parts_edit is not None else False,
            'spare_parts_delete': self.spare_parts_delete if self.spare_parts_delete is not None else False,
            'spare_parts_stock_in': self.spare_parts_stock_in if self.spare_parts_stock_in is not None else False,
            'spare_parts_stock_out': self.spare_parts_stock_out if self.spare_parts_stock_out is not None else False,
            'is_admin': self.is_admin,
            # 서비스 리포트 CRUD 권한
            'service_report_create': getattr(self, 'service_report_create', False),
            'service_report_read': getattr(self, 'service_report_read', False),
            'service_report_update': getattr(self, 'service_report_update', False),
            'service_report_delete': getattr(self, 'service_report_delete', False),
            # 리소스 CRUD 권한
            'resource_create': getattr(self, 'resource_create', False),
            'resource_read': getattr(self, 'resource_read', False),
            'resource_update': getattr(self, 'resource_update', False),
            'resource_delete': getattr(self, 'resource_delete', False),
            # 고객정보 CRUD 권한
            'customer_create': getattr(self, 'customer_create', False),
            'customer_read': getattr(self, 'customer_read', False),
            'customer_update': getattr(self, 'customer_update', False),
            'customer_delete': getattr(self, 'customer_delete', False),
            # 거래명세서 CRUD 권한
            'transaction_create': getattr(self, 'transaction_create', False),
            'transaction_read': getattr(self, 'transaction_read', False),
            'transaction_update': getattr(self, 'transaction_update', False),
            'transaction_delete': getattr(self, 'transaction_delete', False),
            # 부품 CRUD 권한
            'spare_parts_create': getattr(self, 'spare_parts_create', False),
            'spare_parts_read': getattr(self, 'spare_parts_read', False),
            'spare_parts_update': getattr(self, 'spare_parts_update', False),
            'spare_parts_delete_crud': getattr(self, 'spare_parts_delete_crud', False),
            'created_at': getattr(self, 'created_at', None)
        }