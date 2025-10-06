from app.database.init_db import get_db_connection
from datetime import datetime

class Invoice:
    """거래명세표 모델"""
    
    def __init__(self, id=None, service_report_id=None, invoice_number=None,
                 customer_id=None, customer_name=None, customer_address=None,
                 issue_date=None, due_date=None, work_subtotal=0, travel_subtotal=0,
                 parts_subtotal=0, total_amount=0, vat_amount=0, 
                 grand_total=0, notes=None, created_at=None, updated_at=None):
        self.id = id
        self.service_report_id = service_report_id
        self.invoice_number = invoice_number
        self.customer_id = customer_id
        self.customer_name = customer_name
        self.customer_address = customer_address
        self.issue_date = issue_date
        self.due_date = due_date
        self.work_subtotal = work_subtotal
        self.travel_subtotal = travel_subtotal
        self.parts_subtotal = parts_subtotal
        self.total_amount = total_amount
        self.vat_amount = vat_amount
        self.grand_total = grand_total
        self.notes = notes
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_all(cls, page=1, per_page=10):
        """모든 거래명세표 조회 (페이징)"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        invoices_data = conn.execute('''
            SELECT * FROM invoices
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (per_page, offset)).fetchall()
        
        total = conn.execute('SELECT COUNT(*) FROM invoices').fetchone()[0]
        conn.close()
        
        invoices = []
        for data in invoices_data:
            invoice = cls._from_db_row(data)
            invoices.append(invoice)
        
        return invoices, total
    
    @classmethod
    def get_by_id(cls, invoice_id):
        """ID로 거래명세표 조회"""
        conn = get_db_connection()
        data = conn.execute('''
            SELECT * FROM invoices WHERE id = ?
        ''', (invoice_id,)).fetchone()
        conn.close()
        
        if data:
            return cls._from_db_row(data)
        return None
    
    @classmethod
    def get_by_service_report_id(cls, service_report_id):
        """서비스 리포트 ID로 거래명세표 조회"""
        conn = get_db_connection()
        data = conn.execute('''
            SELECT * FROM invoices WHERE service_report_id = ?
        ''', (service_report_id,)).fetchone()
        conn.close()
        
        if data:
            return cls._from_db_row(data)
        return None
    
    @classmethod
    def create_from_service_report(cls, service_report):
        """서비스 리포트를 기반으로 거래명세표 생성"""
        from app.models.invoice_rate import InvoiceRate
        
        # 요율 정보 가져오기
        rates = InvoiceRate.get_rates()
        work_rate = rates.get('work_rate', 50000)  # 기본값 50000원/시간
        travel_rate = rates.get('travel_rate', 30000)  # 기본값 30000원/시간
        
        # 서비스 리포트에서 시간기록과 부품정보 가져오기
        time_records = service_report.get_time_records() if service_report.id else []
        used_parts = service_report.get_parts() if service_report.id else []
        
        # 시간 정보 계산
        work_subtotal = 0
        travel_subtotal = 0
        
        if time_records:
            for time_record in time_records:
                work_hours = cls._time_string_to_hours(time_record.calculated_work_time) if time_record.calculated_work_time else 0
                travel_hours = cls._time_string_to_hours(time_record.calculated_travel_time) if time_record.calculated_travel_time else 0
                
                work_subtotal += work_hours * work_rate
                travel_subtotal += travel_hours * travel_rate
        
        # 부품 정보 계산
        parts_subtotal = 0
        if used_parts:
            for part in used_parts:
                parts_subtotal += part.total_price or 0
        
        # 합계 계산
        total_amount = work_subtotal + travel_subtotal + parts_subtotal
        vat_amount = total_amount * 0.1  # 10% 부가세
        grand_total = total_amount + vat_amount
        
        # 거래명세표 번호 생성
        invoice_number = cls._generate_invoice_number()
        
        # 거래명세표 객체 생성
        invoice = cls(
            service_report_id=service_report.id,
            invoice_number=invoice_number,
            customer_id=service_report.customer_id,
            customer_name=getattr(service_report, 'customer_name', ''),
            customer_address=getattr(service_report, 'customer_address', ''),
            issue_date=datetime.now().strftime('%Y-%m-%d'),
            work_subtotal=work_subtotal,
            travel_subtotal=travel_subtotal,
            parts_subtotal=parts_subtotal,
            total_amount=total_amount,
            vat_amount=vat_amount,
            grand_total=grand_total
        )
        
        return invoice
    
    @classmethod
    def _generate_invoice_number(cls):
        """거래명세표 번호 자동 생성"""
        today = datetime.now()
        prefix = today.strftime('%Y%m')
        
        conn = get_db_connection()
        last_invoice = conn.execute('''
            SELECT invoice_number FROM invoices 
            WHERE invoice_number LIKE ? 
            ORDER BY invoice_number DESC LIMIT 1
        ''', (f'{prefix}%',)).fetchone()
        conn.close()
        
        if last_invoice:
            last_number = int(last_invoice['invoice_number'][-4:])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f'{prefix}{new_number:04d}'
    
    @classmethod
    def _time_string_to_hours(cls, time_str):
        """HH:MM 형식의 시간 문자열을 시간 단위 숫자로 변환"""
        if not time_str:
            return 0
        
        try:
            # "HH:MM" 형식 파싱
            if ':' in str(time_str):
                hours, minutes = str(time_str).split(':')
                return float(hours) + float(minutes) / 60.0
            else:
                # 이미 숫자인 경우
                return float(time_str)
        except (ValueError, AttributeError):
            return 0
    
    def save(self):
        """거래명세표 저장"""
        conn = get_db_connection()
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE invoices SET 
                    invoice_number=?, customer_id=?, customer_name=?, customer_address=?,
                    issue_date=?, due_date=?, work_subtotal=?, travel_subtotal=?,
                    parts_subtotal=?, total_amount=?, vat_amount=?, grand_total=?,
                    notes=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (self.invoice_number, self.customer_id, self.customer_name, 
                     self.customer_address, self.issue_date, self.due_date,
                     self.work_subtotal, self.travel_subtotal, self.parts_subtotal,
                     self.total_amount, self.vat_amount, self.grand_total,
                     self.notes, self.id))
            else:
                # 신규 생성
                cursor = conn.execute('''
                    INSERT INTO invoices (service_report_id, invoice_number, 
                    customer_id, customer_name, customer_address, issue_date, 
                    due_date, work_subtotal, travel_subtotal, parts_subtotal,
                    total_amount, vat_amount, grand_total, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (self.service_report_id, self.invoice_number, self.customer_id,
                     self.customer_name, self.customer_address, self.issue_date,
                     self.due_date, self.work_subtotal, self.travel_subtotal,
                     self.parts_subtotal, self.total_amount, self.vat_amount,
                     self.grand_total, self.notes))
                self.id = cursor.lastrowid
            
            conn.commit()
            return self.id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    @staticmethod
    def delete(invoice_id):
        """거래명세표 삭제"""
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM invoice_items WHERE invoice_id = ?', (invoice_id,))
            conn.execute('DELETE FROM invoices WHERE id = ?', (invoice_id,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            service_report_id=row['service_report_id'],
            invoice_number=row['invoice_number'],
            customer_id=row['customer_id'],
            customer_name=row['customer_name'],
            customer_address=row['customer_address'],
            issue_date=row['issue_date'],
            due_date=row['due_date'],
            work_subtotal=row['work_subtotal'],
            travel_subtotal=row['travel_subtotal'],
            parts_subtotal=row['parts_subtotal'],
            total_amount=row['total_amount'],
            vat_amount=row['vat_amount'],
            grand_total=row['grand_total'],
            notes=row['notes'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'service_report_id': self.service_report_id,
            'invoice_number': self.invoice_number,
            'customer_id': self.customer_id,
            'customer_name': self.customer_name,
            'customer_address': self.customer_address,
            'issue_date': self.issue_date,
            'due_date': self.due_date,
            'work_subtotal': self.work_subtotal,
            'travel_subtotal': self.travel_subtotal,
            'parts_subtotal': self.parts_subtotal,
            'total_amount': self.total_amount,
            'vat_amount': self.vat_amount,
            'grand_total': self.grand_total,
            'notes': self.notes,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def get_items(self):
        """거래명세표 항목들 조회"""
        from app.models.invoice_item import InvoiceItem
        return InvoiceItem.get_by_invoice_id(self.id)