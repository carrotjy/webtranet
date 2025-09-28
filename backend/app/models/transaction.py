from app.database.init_db import get_db_connection
from datetime import datetime

class Transaction:
    def __init__(self, id=None, transaction_number=None, customer_id=None,
                 service_report_id=None, transaction_date=None, total_amount=0,
                 status='pending', notes=None, created_at=None, updated_at=None):
        self.id = id
        self.transaction_number = transaction_number
        self.customer_id = customer_id
        self.service_report_id = service_report_id
        self.transaction_date = transaction_date
        self.total_amount = total_amount
        self.status = status
        self.notes = notes
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_all(cls, page=1, per_page=10):
        """모든 거래명세서 조회 (페이징)"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        transactions_data = conn.execute('''
            SELECT t.*, c.company_name, sr.report_number
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN service_reports sr ON t.service_report_id = sr.id
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        ''', (per_page, offset)).fetchall()
        
        total = conn.execute('SELECT COUNT(*) FROM transactions').fetchone()[0]
        conn.close()
        
        transactions = []
        for data in transactions_data:
            transaction = cls._from_db_row(data)
            transaction.customer_name = data['company_name']
            transaction.service_report_number = data['report_number']
            transactions.append(transaction)
        
        return transactions, total
    
    @classmethod
    def get_by_id(cls, transaction_id):
        """ID로 거래명세서 조회"""
        conn = get_db_connection()
        data = conn.execute('''
            SELECT t.*, c.company_name, sr.report_number
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN service_reports sr ON t.service_report_id = sr.id
            WHERE t.id = ?
        ''', (transaction_id,)).fetchone()
        
        if data:
            transaction = cls._from_db_row(data)
            transaction.customer_name = data['company_name']
            transaction.service_report_number = data['report_number']
            
            # 거래 항목들 조회
            items_data = conn.execute('''
                SELECT * FROM transaction_items WHERE transaction_id = ?
                ORDER BY id
            ''', (transaction_id,)).fetchall()
            
            transaction.items = [TransactionItem._from_db_row(item) for item in items_data]
            conn.close()
            return transaction
        
        conn.close()
        return None
    
    @classmethod
    def search(cls, keyword=None, customer_id=None, status=None, 
               start_date=None, end_date=None, page=1, per_page=10):
        """거래명세서 검색"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        query = '''
            SELECT t.*, c.company_name, sr.report_number
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN service_reports sr ON t.service_report_id = sr.id
            WHERE 1=1
        '''
        params = []
        
        if keyword:
            query += ''' AND (t.transaction_number LIKE ? OR t.notes LIKE ?)'''
            keyword_param = f'%{keyword}%'
            params.extend([keyword_param, keyword_param])
        
        if customer_id:
            query += ' AND t.customer_id = ?'
            params.append(customer_id)
        
        if status:
            query += ' AND t.status = ?'
            params.append(status)
        
        if start_date:
            query += ' AND t.transaction_date >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND t.transaction_date <= ?'
            params.append(end_date)
        
        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?'
        params.extend([per_page, offset])
        
        transactions_data = conn.execute(query, params).fetchall()
        
        # 총 개수 조회
        count_query = query.replace('SELECT t.*, c.company_name, sr.report_number', 'SELECT COUNT(*)')
        count_query = count_query.replace('ORDER BY t.created_at DESC LIMIT ? OFFSET ?', '')
        count_params = params[:-2]
        total = conn.execute(count_query, count_params).fetchone()[0]
        
        conn.close()
        
        transactions = []
        for data in transactions_data:
            transaction = cls._from_db_row(data)
            transaction.customer_name = data['company_name']
            transaction.service_report_number = data['report_number']
            transactions.append(transaction)
        
        return transactions, total
    
    @classmethod
    def create_from_service_report(cls, service_report_id, labor_cost=0, additional_notes=''):
        """서비스 리포트를 기반으로 거래명세서 자동 생성"""
        from app.models.service_report import ServiceReport
        from app.models.spare_part import SparePart
        
        conn = get_db_connection()
        
        try:
            # 서비스 리포트 조회
            service_report = ServiceReport.get_by_id(service_report_id)
            if not service_report:
                raise Exception('서비스 리포트를 찾을 수 없습니다.')
            
            # 이미 거래명세서가 생성되었는지 확인
            existing = conn.execute(
                'SELECT id FROM transactions WHERE service_report_id = ?',
                (service_report_id,)
            ).fetchone()
            
            if existing:
                raise Exception('이미 이 서비스 리포트에 대한 거래명세서가 존재합니다.')
            
            # 거래명세서 생성
            transaction = cls(
                customer_id=service_report.customer_id,
                service_report_id=service_report_id,
                transaction_date=datetime.now().strftime('%Y-%m-%d'),
                status='pending',
                notes=additional_notes
            )
            
            transaction.transaction_number = transaction._generate_transaction_number()
            
            # 거래명세서 저장
            cursor = conn.execute('''
                INSERT INTO transactions 
                (transaction_number, customer_id, service_report_id, 
                 transaction_date, total_amount, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (transaction.transaction_number, transaction.customer_id,
                  transaction.service_report_id, transaction.transaction_date,
                  0, transaction.status, transaction.notes))
            
            transaction.id = cursor.lastrowid
            total_amount = 0
            
            # 인건비 항목 추가
            if labor_cost > 0:
                work_hours = service_report.work_hours or 0
                labor_item = TransactionItem(
                    transaction_id=transaction.id,
                    item_type='service',
                    description=f'작업 인건비 ({work_hours}시간)',
                    quantity=1,
                    unit_price=labor_cost,
                    total_price=labor_cost
                )
                labor_item.save(conn)
                total_amount += labor_cost
            
            # 사용된 부품들 처리
            if service_report.parts_used:
                # parts_used는 JSON 형태의 문자열이라고 가정
                # 예: '[{"part_number": "SP001", "quantity": 2}]'
                import json
                try:
                    parts_list = json.loads(service_report.parts_used)
                    for part_info in parts_list:
                        part = SparePart.get_by_part_number(part_info['part_number'])
                        if part:
                            quantity = int(part_info['quantity'])
                            part_total = part.price * quantity
                            
                            part_item = TransactionItem(
                                transaction_id=transaction.id,
                                item_type='part',
                                item_id=part.id,
                                description=f'{part.part_name} ({part.part_number})',
                                quantity=quantity,
                                unit_price=part.price,
                                total_price=part_total
                            )
                            part_item.save(conn)
                            total_amount += part_total
                            
                            # 재고 차감
                            part.update_stock(quantity, 'subtract')
                            
                except json.JSONDecodeError:
                    # JSON이 아닌 경우 텍스트로 처리
                    if service_report.parts_used.strip():
                        misc_item = TransactionItem(
                            transaction_id=transaction.id,
                            item_type='part',
                            description=f'사용 부품: {service_report.parts_used}',
                            quantity=1,
                            unit_price=0,
                            total_price=0
                        )
                        misc_item.save(conn)
            
            # 총 금액 업데이트
            conn.execute(
                'UPDATE transactions SET total_amount = ? WHERE id = ?',
                (total_amount, transaction.id)
            )
            transaction.total_amount = total_amount
            
            conn.commit()
            return transaction
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def save(self):
        """거래명세서 저장"""
        conn = get_db_connection()
        
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE transactions SET 
                    transaction_number=?, customer_id=?, service_report_id=?,
                    transaction_date=?, total_amount=?, status=?, notes=?,
                    updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (self.transaction_number, self.customer_id, self.service_report_id,
                      self.transaction_date, self.total_amount, self.status,
                      self.notes, self.id))
            else:
                # 신규 생성
                if not self.transaction_number:
                    self.transaction_number = self._generate_transaction_number()
                
                cursor = conn.execute('''
                    INSERT INTO transactions 
                    (transaction_number, customer_id, service_report_id,
                     transaction_date, total_amount, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (self.transaction_number, self.customer_id, self.service_report_id,
                      self.transaction_date, self.total_amount, self.status, self.notes))
                self.id = cursor.lastrowid
            
            conn.commit()
            return self.id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def delete(self):
        """거래명세서 삭제"""
        if self.id:
            conn = get_db_connection()
            try:
                # 거래 항목들도 함께 삭제
                conn.execute('DELETE FROM transaction_items WHERE transaction_id = ?', (self.id,))
                conn.execute('DELETE FROM transactions WHERE id = ?', (self.id,))
                conn.commit()
                return True
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
        return False
    
    def _generate_transaction_number(self):
        """거래명세서 번호 자동 생성 (TR-YYYYMMDD-001 형식)"""
        conn = get_db_connection()
        today = datetime.now().strftime('%Y%m%d')
        prefix = f'TR-{today}-'
        
        last_transaction = conn.execute('''
            SELECT transaction_number FROM transactions 
            WHERE transaction_number LIKE ? 
            ORDER BY transaction_number DESC LIMIT 1
        ''', (f'{prefix}%',)).fetchone()
        
        if last_transaction:
            last_num = int(last_transaction['transaction_number'].split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        conn.close()
        return f'{prefix}{new_num:03d}'
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            transaction_number=row['transaction_number'],
            customer_id=row['customer_id'],
            service_report_id=row['service_report_id'],
            transaction_date=row['transaction_date'],
            total_amount=row['total_amount'],
            status=row['status'],
            notes=row['notes'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def to_dict(self):
        """딕셔너리로 변환"""
        result = {
            'id': self.id,
            'transaction_number': self.transaction_number,
            'customer_id': self.customer_id,
            'service_report_id': self.service_report_id,
            'transaction_date': self.transaction_date,
            'total_amount': self.total_amount,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        
        # 추가 정보가 있으면 포함
        if hasattr(self, 'customer_name'):
            result['customer_name'] = self.customer_name
        if hasattr(self, 'service_report_number'):
            result['service_report_number'] = self.service_report_number
        if hasattr(self, 'items'):
            result['items'] = [item.to_dict() for item in self.items]
        
        return result


class TransactionItem:
    def __init__(self, id=None, transaction_id=None, item_type=None,
                 item_id=None, description=None, quantity=1, 
                 unit_price=0, total_price=0):
        self.id = id
        self.transaction_id = transaction_id
        self.item_type = item_type  # 'service' or 'part'
        self.item_id = item_id
        self.description = description
        self.quantity = quantity
        self.unit_price = unit_price
        self.total_price = total_price
    
    def save(self, conn=None):
        """거래 항목 저장"""
        close_conn = False
        if conn is None:
            conn = get_db_connection()
            close_conn = True
        
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE transaction_items SET 
                    item_type=?, item_id=?, description=?, quantity=?,
                    unit_price=?, total_price=?
                    WHERE id=?
                ''', (self.item_type, self.item_id, self.description,
                      self.quantity, self.unit_price, self.total_price, self.id))
            else:
                # 신규 생성
                cursor = conn.execute('''
                    INSERT INTO transaction_items 
                    (transaction_id, item_type, item_id, description,
                     quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (self.transaction_id, self.item_type, self.item_id,
                      self.description, self.quantity, self.unit_price, self.total_price))
                self.id = cursor.lastrowid
            
            if close_conn:
                conn.commit()
            return self.id
        except Exception as e:
            if close_conn:
                conn.rollback()
            raise e
        finally:
            if close_conn:
                conn.close()
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            transaction_id=row['transaction_id'],
            item_type=row['item_type'],
            item_id=row['item_id'],
            description=row['description'],
            quantity=row['quantity'],
            unit_price=row['unit_price'],
            total_price=row['total_price']
        )
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'item_type': self.item_type,
            'item_id': self.item_id,
            'description': self.description,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': self.total_price
        }