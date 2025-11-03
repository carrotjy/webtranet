from app.database.init_db import get_db_connection
from datetime import datetime
from app.models.service_report_part import ServiceReportPart
from app.models.service_report_time_record import ServiceReportTimeRecord

class ServiceReport:
    def __init__(self, id=None, report_number=None, customer_id=None,
                 technician_id=None, machine_model=None, machine_serial=None,
                 service_date=None, problem_description=None,
                 solution_description=None, parts_used=None, work_hours=None,
                 status='completed', invoice_code_id=None, support_technician_ids=None,
                 is_locked=False, locked_by=None, locked_at=None,
                 created_at=None, updated_at=None):
        self.id = id
        self.report_number = report_number
        self.customer_id = customer_id
        self.technician_id = technician_id
        self.machine_model = machine_model
        self.machine_serial = machine_serial
        self.service_date = service_date
        self.problem_description = problem_description
        self.solution_description = solution_description
        self.parts_used = parts_used
        self.work_hours = work_hours
        self.status = status
        self.invoice_code_id = invoice_code_id
        self.support_technician_ids = support_technician_ids  # JSON 문자열로 저장
        self.is_locked = is_locked
        self.locked_by = locked_by
        self.locked_at = locked_at
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_all(cls, page=1, per_page=10):
        """모든 서비스 리포트 조회 (페이징)"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        reports_data = conn.execute('''
            SELECT sr.*, c.company_name, c.address as customer_address, u.name as technician_name,
                   ic.code as invoice_code, ic.description as invoice_description
            FROM service_reports sr
            LEFT JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN users u ON sr.technician_id = u.id
            LEFT JOIN invoice_codes ic ON sr.invoice_code_id = ic.id
            ORDER BY sr.created_at DESC
            LIMIT ? OFFSET ?
        ''', (per_page, offset)).fetchall()
        
        total = conn.execute('SELECT COUNT(*) FROM service_reports').fetchone()[0]
        conn.close()
        
        reports = []
        for data in reports_data:
            report = cls._from_db_row(data)
            # 추가 정보 포함
            report.customer_name = data['company_name']
            report.customer_address = data['customer_address']
            report.technician_name = data['technician_name']
            report.invoice_code = data['invoice_code']
            report.invoice_description = data['invoice_description']
            reports.append(report)
        
        return reports, total
    
    @classmethod
    def get_by_id(cls, report_id):
        """ID로 서비스 리포트 조회"""
        conn = get_db_connection()
        data = conn.execute('''
            SELECT sr.*, c.company_name, c.address as customer_address, u.name as technician_name,
                   ic.code as invoice_code, ic.description as invoice_description
            FROM service_reports sr
            LEFT JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN users u ON sr.technician_id = u.id
            LEFT JOIN invoice_codes ic ON sr.invoice_code_id = ic.id
            WHERE sr.id = ?
        ''', (report_id,)).fetchone()
        conn.close()
        
        if data:
            report = cls._from_db_row(data)
            report.customer_name = data['company_name']
            report.customer_address = data['customer_address']
            report.technician_name = data['technician_name']
            report.invoice_code = data['invoice_code']
            report.invoice_description = data['invoice_description']
            return report
        return None
    
    @classmethod
    def search(cls, keyword=None, customer_id=None, technician_id=None, 
               start_date=None, end_date=None, page=1, per_page=10):
        """서비스 리포트 검색"""
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        query = '''
            SELECT sr.*, c.company_name, u.name as technician_name,
                   ic.code as invoice_code, ic.description as invoice_description
            FROM service_reports sr
            LEFT JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN users u ON sr.technician_id = u.id
            LEFT JOIN invoice_codes ic ON sr.invoice_code_id = ic.id
            WHERE 1=1
        '''
        params = []
        
        if keyword:
            query += ''' AND (sr.report_number LIKE ? OR sr.problem_description LIKE ? 
                           OR sr.solution_description LIKE ? OR sr.machine_model LIKE ?)'''
            keyword_param = f'%{keyword}%'
            params.extend([keyword_param, keyword_param, keyword_param, keyword_param])
        
        if customer_id:
            query += ' AND sr.customer_id = ?'
            params.append(customer_id)
        
        if technician_id:
            query += ' AND sr.technician_id = ?'
            params.append(technician_id)
        
        if start_date:
            query += ' AND sr.service_date >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND sr.service_date <= ?'
            params.append(end_date)
        
        query += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?'
        params.extend([per_page, offset])
        
        reports_data = conn.execute(query, params).fetchall()
        
        # 총 개수 조회
        count_query = query.replace('SELECT sr.*, c.company_name, u.name as technician_name', 'SELECT COUNT(*)')
        count_query = count_query.replace('ORDER BY sr.created_at DESC LIMIT ? OFFSET ?', '')
        count_params = params[:-2]  # LIMIT, OFFSET 제외
        total = conn.execute(count_query, count_params).fetchone()[0]
        
        conn.close()
        
        reports = []
        for data in reports_data:
            report = cls._from_db_row(data)
            report.customer_name = data['company_name']
            report.technician_name = data['technician_name']
            reports.append(report)
        
        return reports, total
    
    def save(self):
        """서비스 리포트 저장 (생성 또는 수정)"""
        conn = get_db_connection()
        
        try:
            print(f"[DEBUG] Saving ServiceReport - id: {self.id}")
            if self.id:
                # 수정
                print(f"[DEBUG] Updating existing report with id: {self.id}")
                conn.execute('''
                    UPDATE service_reports SET 
                    report_number=?, customer_id=?, technician_id=?, machine_model=?,
                    machine_serial=?, service_date=?, problem_description=?,
                    solution_description=?, parts_used=?, work_hours=?, status=?,
                    invoice_code_id=?, support_technician_ids=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (self.report_number, self.customer_id, self.technician_id,
                      self.machine_model, self.machine_serial, self.service_date,
                      self.problem_description, self.solution_description,
                      self.parts_used, self.work_hours, self.status, 
                      self.invoice_code_id, self.support_technician_ids, self.id))
            else:
                # 신규 생성
                if not self.report_number:
                    print("[DEBUG] Generating report number")
                    self.report_number = self._generate_report_number()
                    print(f"[DEBUG] Generated report number: {self.report_number}")
                
                print(f"[DEBUG] Inserting new report with values: {(self.report_number, self.customer_id, self.technician_id, self.machine_model, self.machine_serial, self.service_date, self.problem_description, self.solution_description, self.parts_used, self.work_hours, self.status)}")
                
                cursor = conn.execute('''
                    INSERT INTO service_reports 
                    (report_number, customer_id, technician_id, machine_model,
                     machine_serial, service_date, problem_description,
                     solution_description, parts_used, work_hours, status, 
                     invoice_code_id, support_technician_ids)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (self.report_number, self.customer_id, self.technician_id,
                      self.machine_model, self.machine_serial, self.service_date,
                      self.problem_description, self.solution_description,
                      self.parts_used, self.work_hours, self.status, 
                      self.invoice_code_id, self.support_technician_ids))
                self.id = cursor.lastrowid
                print(f"[DEBUG] New report created with id: {self.id}")
            
            conn.commit()
            print(f"[DEBUG] Transaction committed successfully")
            return self.id
        except Exception as e:
            print(f"[ERROR] Database error in save(): {str(e)}")
            import traceback
            traceback.print_exc()
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def delete(self):
        """서비스 리포트 삭제"""
        if self.id:
            conn = get_db_connection()
            try:
                conn.execute('DELETE FROM service_reports WHERE id = ?', (self.id,))
                conn.commit()
                return True
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
        return False
    
    def _generate_report_number(self):
        """리포트 번호 자동 생성 (SR-YYYYMMDD-001 형식)"""
        try:
            conn = get_db_connection()
            today = datetime.now().strftime('%Y%m%d')
            prefix = f'SR-{today}-'
            
            print(f"[DEBUG] Generating report number with prefix: {prefix}")
            
            # 오늘 날짜의 마지막 리포트 번호 조회
            last_report = conn.execute('''
                SELECT report_number FROM service_reports 
                WHERE report_number LIKE ? 
                ORDER BY report_number DESC LIMIT 1
            ''', (f'{prefix}%',)).fetchone()
            
            if last_report:
                print(f"[DEBUG] Found last report: {last_report['report_number']}")
                last_num = int(last_report['report_number'].split('-')[-1])
                new_num = last_num + 1
            else:
                print("[DEBUG] No previous reports found for today")
                new_num = 1
            
            conn.close()
            new_report_number = f'{prefix}{new_num:03d}'
            print(f"[DEBUG] Generated new report number: {new_report_number}")
            return new_report_number
        except Exception as e:
            print(f"[ERROR] Error generating report number: {str(e)}")
            import traceback
            traceback.print_exc()
            raise e
    
    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        report = cls(
            id=row['id'],
            report_number=row['report_number'],
            customer_id=row['customer_id'],
            technician_id=row['technician_id'],
            machine_model=row['machine_model'],
            machine_serial=row['machine_serial'],
            service_date=row['service_date'],
            problem_description=row['problem_description'],
            solution_description=row['solution_description'],
            parts_used=row['parts_used'],
            work_hours=row['work_hours'],
            status=row['status'],
            invoice_code_id=row['invoice_code_id'] if 'invoice_code_id' in row.keys() else None,
            support_technician_ids=row['support_technician_ids'] if 'support_technician_ids' in row.keys() else None,
            is_locked=row['is_locked'] if 'is_locked' in row.keys() else False,
            locked_by=row['locked_by'] if 'locked_by' in row.keys() else None,
            locked_at=row['locked_at'] if 'locked_at' in row.keys() else None,
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
        
        # Invoice 코드 정보 추가 (JOIN으로 가져온 경우)
        if 'invoice_code' in row.keys():
            report.invoice_code = row['invoice_code']
        if 'invoice_description' in row.keys():
            report.invoice_description = row['invoice_description']
            
        return report
    
    def save_parts(self, parts_data):
        """사용부품 저장 (기존 부품 삭제 후 새로 저장)"""
        if not self.id:
            return False
        
        # 기존 부품 삭제
        ServiceReportPart.delete_by_service_report_id(self.id)
        
        # 새 부품 저장
        if parts_data and isinstance(parts_data, list):
            for part_info in parts_data:
                if part_info.get('part_name'):  # 부품명이 있는 경우만 저장
                    part = ServiceReportPart(
                        service_report_id=self.id,
                        part_name=part_info.get('part_name', ''),
                        part_number=part_info.get('part_number', ''),
                        quantity=int(part_info.get('quantity', 1)),
                        unit_price=float(part_info.get('unit_price', 0.0)),
                        total_price=float(part_info.get('total_price', 0.0))
                    )
                    part.save()
        return True

    def get_parts(self):
        """서비스 리포트의 사용부품 목록 조회"""
        if not self.id:
            return []
        return ServiceReportPart.get_by_service_report_id(self.id)

    def save_time_records(self, time_records_data):
        """시간기록 저장 (기존 시간기록 삭제 후 새로 저장)"""
        if not self.id:
            return False
        
        # 기존 시간기록 삭제
        ServiceReportTimeRecord.delete_by_service_report_id(self.id)
        
        # 새 시간기록 저장
        if time_records_data and isinstance(time_records_data, list):
            for record_info in time_records_data:
                if record_info.get('date') or record_info.get('work_date'):  # 날짜가 있는 경우만 저장
                    work_date = record_info.get('date') or record_info.get('work_date')
                    record = ServiceReportTimeRecord(
                        service_report_id=self.id,
                        work_date=work_date,
                        departure_time=record_info.get('departure_time', ''),
                        work_start_time=record_info.get('work_start_time', ''),
                        work_end_time=record_info.get('work_end_time', ''),
                        travel_end_time=record_info.get('travel_end_time', ''),
                        work_meal_time=record_info.get('work_meal_time', ''),
                        travel_meal_time=record_info.get('travel_meal_time', ''),
                        calculated_work_time=record_info.get('calculated_work_time', ''),
                        calculated_travel_time=record_info.get('calculated_travel_time', '')
                    )
                    record.calculate_times()  # 시간 자동 계산
                    record.save()
        return True

    def get_time_records(self):
        """서비스 리포트의 시간기록 목록 조회"""
        if not self.id:
            return []
        return ServiceReportTimeRecord.get_by_service_report_id(self.id)

    def to_dict(self):
        """딕셔너리로 변환"""
        import json

        result = {
            'id': self.id,
            'report_number': self.report_number,
            'customer_id': self.customer_id,
            'technician_id': self.technician_id,
            'machine_model': self.machine_model,
            'machine_serial': self.machine_serial,
            'service_date': self.service_date,
            'problem_description': self.problem_description,
            'solution_description': self.solution_description,
            'parts_used': self.parts_used,  # 하위 호환성을 위해 유지
            'work_hours': self.work_hours,
            'status': self.status,
            'invoice_code_id': self.invoice_code_id,
            'support_technician_ids': json.loads(self.support_technician_ids) if self.support_technician_ids else [],
            'is_locked': self.is_locked,
            'locked_by': self.locked_by,
            'locked_at': self.locked_at,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        
        # 새로운 부품 정보 포함
        if self.id:
            parts = self.get_parts()
            result['used_parts'] = [part.to_dict() for part in parts]
            
            # 새로운 시간기록 정보 포함
            time_records = self.get_time_records()
            result['time_records'] = [record.to_dict() for record in time_records]
            
            # 하위 호환성을 위한 time_record (첫 번째 시간기록)
            result['time_record'] = time_records[0].to_dict() if time_records else None
        else:
            result['used_parts'] = []
            result['time_records'] = []
            result['time_record'] = None
        
        # 추가 정보가 있으면 포함
        if hasattr(self, 'customer_name'):
            result['customer_name'] = self.customer_name
        if hasattr(self, 'customer_address'):
            result['customer_address'] = self.customer_address
        if hasattr(self, 'technician_name'):
            result['technician_name'] = self.technician_name
        if hasattr(self, 'invoice_code'):
            result['invoice_code'] = self.invoice_code
        if hasattr(self, 'invoice_description'):
            result['invoice_description'] = self.invoice_description

        return result

    def lock(self, user_id):
        """서비스 리포트 잠금"""
        if not self.id:
            return False

        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE service_reports
                SET is_locked = 1, locked_by = ?, locked_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (user_id, self.id))
            conn.commit()

            # 객체 상태 업데이트
            self.is_locked = True
            self.locked_by = user_id
            self.locked_at = datetime.now().isoformat()

            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def unlock(self):
        """서비스 리포트 잠금 해제"""
        if not self.id:
            return False

        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE service_reports
                SET is_locked = 0, locked_by = NULL, locked_at = NULL
                WHERE id = ?
            ''', (self.id,))
            conn.commit()

            # 객체 상태 업데이트
            self.is_locked = False
            self.locked_by = None
            self.locked_at = None

            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()