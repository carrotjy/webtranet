from app.database.init_db import get_db_connection
from datetime import datetime

class ServiceReportTimeRecord:
    def __init__(self, id=None, service_report_id=None, work_date=None,
                 departure_time=None, work_start_time=None, work_end_time=None,
                 travel_end_time=None, work_meal_time=None, travel_meal_time=None,
                 calculated_work_time=None, calculated_travel_time=None,
                 created_at=None, updated_at=None):
        self.id = id
        self.service_report_id = service_report_id
        self.work_date = work_date
        self.departure_time = departure_time
        self.work_start_time = work_start_time
        self.work_end_time = work_end_time
        self.travel_end_time = travel_end_time
        self.work_meal_time = work_meal_time
        self.travel_meal_time = travel_meal_time
        self.calculated_work_time = calculated_work_time
        self.calculated_travel_time = calculated_travel_time
        self.created_at = created_at
        self.updated_at = updated_at

    def save(self):
        """시간기록 정보 저장"""
        conn = get_db_connection()
        
        if self.id:
            # 수정
            conn.execute('''
                UPDATE service_report_time_records
                SET work_date=?, departure_time=?, work_start_time=?, work_end_time=?,
                    travel_end_time=?, work_meal_time=?, travel_meal_time=?,
                    calculated_work_time=?, calculated_travel_time=?, updated_at=?
                WHERE id=?
            ''', (self.work_date, self.departure_time, self.work_start_time, self.work_end_time,
                  self.travel_end_time, self.work_meal_time, self.travel_meal_time,
                  self.calculated_work_time, self.calculated_travel_time,
                  datetime.now().isoformat(), self.id))
        else:
            # 신규 생성
            cursor = conn.execute('''
                INSERT INTO service_report_time_records 
                (service_report_id, work_date, departure_time, work_start_time, work_end_time,
                 travel_end_time, work_meal_time, travel_meal_time, calculated_work_time, calculated_travel_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (self.service_report_id, self.work_date, self.departure_time, self.work_start_time,
                  self.work_end_time, self.travel_end_time, self.work_meal_time, self.travel_meal_time,
                  self.calculated_work_time, self.calculated_travel_time))
            self.id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return self.id

    @classmethod
    def get_by_service_report_id(cls, service_report_id):
        """서비스 리포트 ID로 시간기록 목록 조회"""
        conn = get_db_connection()
        records_data = conn.execute('''
            SELECT * FROM service_report_time_records
            WHERE service_report_id = ?
            ORDER BY work_date, id
        ''', (service_report_id,)).fetchall()
        conn.close()
        
        records = []
        for data in records_data:
            record = cls._from_db_row(data)
            records.append(record)
        return records

    @classmethod
    def delete_by_service_report_id(cls, service_report_id):
        """서비스 리포트의 모든 시간기록 삭제"""
        conn = get_db_connection()
        conn.execute('''
            DELETE FROM service_report_time_records WHERE service_report_id = ?
        ''', (service_report_id,))
        conn.commit()
        conn.close()

    def delete(self):
        """특정 시간기록 삭제"""
        if not self.id:
            return False
        
        conn = get_db_connection()
        conn.execute('DELETE FROM service_report_time_records WHERE id = ?', (self.id,))
        conn.commit()
        conn.close()
        return True

    def calculate_times(self):
        """작업시간과 이동시간을 자동 계산"""
        try:
            # 작업시간 계산
            if self.work_start_time and self.work_end_time:
                work_time = self._calculate_time_difference(self.work_start_time, self.work_end_time)
                if work_time:
                    # 식사시간 차감 (HH:MM 형식에서 분 변환)
                    work_meal_minutes = self._time_to_minutes(self.work_meal_time) if self.work_meal_time else 0
                    work_time = self._subtract_minutes(work_time, work_meal_minutes)
                    self.calculated_work_time = work_time
            
            # 이동시간 계산 (전체 시간 - 작업시간)
            if (self.departure_time and self.travel_end_time and 
                self.work_start_time and self.work_end_time):
                total_time = self._calculate_time_difference(self.departure_time, self.travel_end_time)
                work_duration = self._calculate_time_difference(self.work_start_time, self.work_end_time)
                
                if total_time and work_duration:
                    travel_time = self._subtract_time_duration(total_time, work_duration)
                    # 식사시간 차감 (HH:MM 형식에서 분 변환)
                    travel_meal_minutes = self._time_to_minutes(self.travel_meal_time) if self.travel_meal_time else 0
                    travel_time = self._subtract_minutes(travel_time, travel_meal_minutes)
                    self.calculated_travel_time = travel_time
                    
        except Exception as e:
            print(f"[DEBUG] 시간 계산 오류: {e}")
            pass

    def _calculate_time_difference(self, start_time, end_time):
        """시작시간과 종료시간의 차이를 HH:MM 형식으로 계산"""
        try:
            from datetime import datetime, timedelta
            
            # "HH:MM" 형식을 datetime 객체로 변환
            start = datetime.strptime(start_time, "%H:%M")
            end = datetime.strptime(end_time, "%H:%M")
            
            # 종료시간이 시작시간보다 이른 경우 (다음날로 넘어간 경우)
            if end < start:
                end += timedelta(days=1)
            
            # 시간 차이 계산
            diff = end - start
            hours = diff.seconds // 3600
            minutes = (diff.seconds % 3600) // 60
            
            return f"{hours:02d}:{minutes:02d}"
        except:
            return None

    def _time_to_minutes(self, time_str):
        """HH:MM 형식의 시간을 분으로 변환"""
        try:
            if not time_str:
                return 0
            
            from datetime import datetime
            time_obj = datetime.strptime(time_str, "%H:%M")
            return time_obj.hour * 60 + time_obj.minute
        except:
            return 0

    def _subtract_minutes(self, time_str, minutes):
        """HH:MM 형식의 시간에서 분을 빼기"""
        try:
            from datetime import datetime, timedelta
            
            time_obj = datetime.strptime(time_str, "%H:%M")
            result = time_obj - timedelta(minutes=minutes)
            
            # 음수가 되는 경우 0:00 반환
            if result.hour < 0 or (result.hour == 0 and result.minute < 0):
                return "00:00"
                
            return f"{result.hour:02d}:{result.minute:02d}"
        except:
            return time_str

    def _subtract_time_duration(self, total_time, work_time):
        """전체시간에서 작업시간을 빼서 이동시간 계산"""
        try:
            from datetime import datetime, timedelta
            
            total = datetime.strptime(total_time, "%H:%M")
            work = datetime.strptime(work_time, "%H:%M")
            
            # 시간을 분으로 변환
            total_minutes = total.hour * 60 + total.minute
            work_minutes = work.hour * 60 + work.minute
            
            travel_minutes = total_minutes - work_minutes
            
            # 음수가 되는 경우 0:00 반환
            if travel_minutes < 0:
                return "00:00"
            
            hours = travel_minutes // 60
            minutes = travel_minutes % 60
            
            return f"{hours:02d}:{minutes:02d}"
        except:
            return "00:00"

    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            service_report_id=row['service_report_id'],
            work_date=row['work_date'],
            departure_time=row['departure_time'],
            work_start_time=row['work_start_time'],
            work_end_time=row['work_end_time'],
            travel_end_time=row['travel_end_time'],
            work_meal_time=row['work_meal_time'],
            travel_meal_time=row['travel_meal_time'],
            calculated_work_time=row['calculated_work_time'],
            calculated_travel_time=row['calculated_travel_time'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'service_report_id': self.service_report_id,
            'date': self.work_date,  # Frontend TimeRecord 인터페이스와 맞춤
            'work_date': self.work_date,
            'departure_time': self.departure_time,
            'work_start_time': self.work_start_time,
            'work_end_time': self.work_end_time,
            'travel_end_time': self.travel_end_time,
            'work_meal_time': self.work_meal_time,
            'travel_meal_time': self.travel_meal_time,
            'calculated_work_time': self.calculated_work_time,
            'calculated_travel_time': self.calculated_travel_time,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }