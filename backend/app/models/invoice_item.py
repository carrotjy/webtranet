from app.database.init_db import get_db_connection

class InvoiceItem:
    """거래명세표 항목 모델"""

    def __init__(self, id=None, invoice_id=None, item_type=None,
                 description=None, quantity=None, unit_price=None,
                 total_price=None, month=None, day=None, item_name=None,
                 part_number=None, is_header=None, row_order=None,
                 created_at=None, updated_at=None):
        self.id = id
        self.invoice_id = invoice_id
        self.item_type = item_type  # 'work', 'travel', 'parts', 'nego'
        self.description = description
        self.quantity = quantity
        self.unit_price = unit_price
        self.total_price = total_price
        self.month = month
        self.day = day
        self.item_name = item_name
        self.part_number = part_number
        self.is_header = is_header if is_header is not None else 0
        self.row_order = row_order if row_order is not None else 0
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_by_invoice_id(cls, invoice_id):
        """거래명세표 ID로 항목들 조회"""
        conn = get_db_connection()
        items_data = conn.execute('''
            SELECT * FROM invoice_items
            WHERE invoice_id = ?
            ORDER BY row_order, id
        ''', (invoice_id,)).fetchall()
        conn.close()

        items = []
        for data in items_data:
            item = cls._from_db_row(data)
            items.append(item)

        return items
    
    @classmethod
    def create_from_service_report(cls, invoice_id, service_report):
        """서비스 리포트를 기반으로 거래명세표 항목들 생성"""
        from app.models.invoice_rate import InvoiceRate
        
        # 요율 정보 가져오기
        rates = InvoiceRate.get_rates()
        work_rate = rates.get('work_rate', 50000)  # 기본값 50000원/시간
        travel_rate = rates.get('travel_rate', 30000)  # 기본값 30000원/시간
        
        items = []
        
        # 서비스 리포트에서 시간기록과 부품정보 가져오기
        time_records = service_report.get_time_records() if service_report.id else []
        used_parts = service_report.get_parts() if service_report.id else []
        
        # 시간기록이 있는 경우 작업 및 이동시간 항목 생성
        if time_records:
            # 모든 시간기록의 작업시간과 이동시간 합계 계산
            total_work_hours = 0
            total_travel_hours = 0
            
            for time_record in time_records:
                work_hours = cls._time_string_to_hours(time_record.calculated_work_time) if time_record.calculated_work_time else 0
                travel_hours = cls._time_string_to_hours(time_record.calculated_travel_time) if time_record.calculated_travel_time else 0
                
                total_work_hours += work_hours
                total_travel_hours += travel_hours
            
            # FSE 이름 가져오기 (서비스 리포트에서 technician_name 사용)
            fse_name = getattr(service_report, 'technician_name', '서비스 엔지니어')
            
            # 작업 및 이동시간을 하나의 항목으로 생성
            if total_work_hours > 0 or total_travel_hours > 0:
                # 설명 텍스트 생성
                description_lines = [f"작업 및 이동시간({fse_name})"]
                
                if total_work_hours > 0:
                    description_lines.append(f"작업시간 {total_work_hours:.1f}시간")
                
                if total_travel_hours > 0:
                    description_lines.append(f"이동시간 {total_travel_hours:.1f}시간")
                
                description = "\n".join(description_lines)
                
                # 작업시간을 수량으로 사용하고, 작업시간 + 이동시간의 혼합 요율로 단가 계산
                total_hours = total_work_hours + total_travel_hours
                if total_hours > 0:
                    # 가중평균 단가 계산
                    weighted_rate = ((total_work_hours * work_rate) + (total_travel_hours * travel_rate)) / total_hours
                    
                    time_item = cls(
                        invoice_id=invoice_id,
                        item_type='work',
                        description=description,
                        quantity=total_work_hours,  # 수량은 작업시간만 사용
                        unit_price=weighted_rate,   # 가중평균 단가
                        total_price=(total_work_hours * work_rate) + (total_travel_hours * travel_rate)
                    )
                    items.append(time_item)
        
        # 부품 항목들 추가
        if used_parts:
            for part in used_parts:
                if part.quantity > 0:
                    part_item = cls(
                        invoice_id=invoice_id,
                        item_type='parts',
                        description=f"{part.part_name}" + (f" ({part.part_number})" if part.part_number else ""),
                        quantity=part.quantity,
                        unit_price=part.unit_price,
                        total_price=part.total_price
                    )
                    items.append(part_item)
        
        return items
    
    def save(self):
        """거래명세표 항목 저장"""
        conn = get_db_connection()
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE invoice_items SET
                    item_type=?, description=?, quantity=?, unit_price=?,
                    total_price=?, month=?, day=?, item_name=?, part_number=?, is_header=?, row_order=?,
                    updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (self.item_type, self.description, self.quantity,
                     self.unit_price, self.total_price, self.month, self.day,
                     self.item_name, self.part_number, self.is_header, self.row_order, self.id))
            else:
                # 신규 생성
                cursor = conn.execute('''
                    INSERT INTO invoice_items (invoice_id, item_type, description,
                    quantity, unit_price, total_price, month, day, item_name, part_number, is_header, row_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (self.invoice_id, self.item_type, self.description,
                     self.quantity, self.unit_price, self.total_price,
                     self.month, self.day, self.item_name, self.part_number, self.is_header, self.row_order))
                self.id = cursor.lastrowid

            conn.commit()
            return self.id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    @staticmethod
    def delete_by_invoice_id(invoice_id):
        """거래명세표 ID로 모든 항목 삭제"""
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM invoice_items WHERE invoice_id = ?', (invoice_id,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
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
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            invoice_id=row['invoice_id'],
            item_type=row['item_type'],
            description=row['description'],
            quantity=row['quantity'],
            unit_price=row['unit_price'],
            total_price=row['total_price'],
            month=row['month'] if 'month' in row.keys() else None,
            day=row['day'] if 'day' in row.keys() else None,
            item_name=row['item_name'] if 'item_name' in row.keys() else None,
            part_number=row['part_number'] if 'part_number' in row.keys() else None,
            is_header=row['is_header'] if 'is_header' in row.keys() else 0,
            row_order=row['row_order'] if 'row_order' in row.keys() else 0,
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'item_type': self.item_type,
            'description': self.description,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': self.total_price,
            'month': self.month,
            'day': self.day,
            'item_name': self.item_name,
            'part_number': self.part_number,
            'is_header': self.is_header,
            'row_order': self.row_order,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }