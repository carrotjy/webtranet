from app.database.init_db import get_db_connection

class InvoiceRate:
    """거래명세표 요율 설정 모델"""
    
    def __init__(self, id=None, work_rate=0, travel_rate=0, 
                 created_at=None, updated_at=None):
        self.id = id
        self.work_rate = work_rate      # 작업시간 시간당 요율
        self.travel_rate = travel_rate  # 이동시간 시간당 요율
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_rates(cls):
        """현재 설정된 요율 조회"""
        conn = get_db_connection()
        data = conn.execute('''
            SELECT * FROM invoice_rates ORDER BY id DESC LIMIT 1
        ''').fetchone()
        conn.close()
        
        if data:
            return {
                'work_rate': data['work_rate'],
                'travel_rate': data['travel_rate']
            }
        else:
            # 기본값 반환
            return {
                'work_rate': 50000,  # 기본 작업시간 요율 (원/시간)
                'travel_rate': 30000  # 기본 이동시간 요율 (원/시간)
            }
    
    @classmethod
    def get_current_setting(cls):
        """현재 요율 설정 객체 조회"""
        conn = get_db_connection()
        data = conn.execute('''
            SELECT * FROM invoice_rates ORDER BY id DESC LIMIT 1
        ''').fetchone()
        conn.close()
        
        if data:
            return cls._from_db_row(data)
        else:
            # 기본 설정 생성
            default_setting = cls(work_rate=50000, travel_rate=30000)
            default_setting.save()
            return default_setting
    
    def save(self):
        """요율 설정 저장"""
        conn = get_db_connection()
        try:
            if self.id:
                # 수정
                conn.execute('''
                    UPDATE invoice_rates SET 
                    work_rate=?, travel_rate=?, updated_at=CURRENT_TIMESTAMP
                    WHERE id=?
                ''', (self.work_rate, self.travel_rate, self.id))
            else:
                # 신규 생성 (기존 설정을 업데이트하는 방식)
                # 기존 설정이 있으면 업데이트, 없으면 신규 생성
                existing = conn.execute('SELECT id FROM invoice_rates LIMIT 1').fetchone()
                if existing:
                    conn.execute('''
                        UPDATE invoice_rates SET 
                        work_rate=?, travel_rate=?, updated_at=CURRENT_TIMESTAMP
                        WHERE id=?
                    ''', (self.work_rate, self.travel_rate, existing['id']))
                    self.id = existing['id']
                else:
                    cursor = conn.execute('''
                        INSERT INTO invoice_rates (work_rate, travel_rate)
                        VALUES (?, ?)
                    ''', (self.work_rate, self.travel_rate))
                    self.id = cursor.lastrowid
            
            conn.commit()
            return self.id
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
            work_rate=row['work_rate'],
            travel_rate=row['travel_rate'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'work_rate': self.work_rate,
            'travel_rate': self.travel_rate,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }