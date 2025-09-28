from app.database.init_db import get_db_connection
from datetime import datetime

class ServiceReportPart:
    def __init__(self, id=None, service_report_id=None, part_name=None, 
                 part_number=None, quantity=1, unit_price=0.0, total_price=0.0,
                 created_at=None, updated_at=None):
        self.id = id
        self.service_report_id = service_report_id
        self.part_name = part_name
        self.part_number = part_number
        self.quantity = quantity
        self.unit_price = unit_price
        self.total_price = total_price
        self.created_at = created_at
        self.updated_at = updated_at

    def save(self):
        """사용부품 정보 저장"""
        conn = get_db_connection()
        
        if self.id:
            # 수정
            conn.execute('''
                UPDATE service_report_parts
                SET part_name=?, part_number=?, quantity=?, unit_price=?, 
                    total_price=?, updated_at=?
                WHERE id=?
            ''', (self.part_name, self.part_number, self.quantity, 
                  self.unit_price, self.total_price, 
                  datetime.now().isoformat(), self.id))
        else:
            # 신규 생성
            cursor = conn.execute('''
                INSERT INTO service_report_parts 
                (service_report_id, part_name, part_number, quantity, 
                 unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (self.service_report_id, self.part_name, self.part_number,
                  self.quantity, self.unit_price, self.total_price))
            self.id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return self.id

    @classmethod
    def get_by_service_report_id(cls, service_report_id):
        """서비스 리포트 ID로 사용부품 목록 조회"""
        conn = get_db_connection()
        parts_data = conn.execute('''
            SELECT * FROM service_report_parts
            WHERE service_report_id = ?
            ORDER BY id
        ''', (service_report_id,)).fetchall()
        conn.close()
        
        parts = []
        for data in parts_data:
            part = cls._from_db_row(data)
            parts.append(part)
        return parts

    @classmethod
    def delete_by_service_report_id(cls, service_report_id):
        """서비스 리포트의 모든 사용부품 삭제"""
        conn = get_db_connection()
        conn.execute('''
            DELETE FROM service_report_parts WHERE service_report_id = ?
        ''', (service_report_id,))
        conn.commit()
        conn.close()

    def delete(self):
        """특정 사용부품 삭제"""
        if not self.id:
            return False
        
        conn = get_db_connection()
        conn.execute('DELETE FROM service_report_parts WHERE id = ?', (self.id,))
        conn.commit()
        conn.close()
        return True

    @classmethod
    def _from_db_row(cls, row):
        """데이터베이스 행에서 객체 생성"""
        return cls(
            id=row['id'],
            service_report_id=row['service_report_id'],
            part_name=row['part_name'],
            part_number=row['part_number'],
            quantity=row['quantity'],
            unit_price=row['unit_price'],
            total_price=row['total_price'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'service_report_id': self.service_report_id,
            'part_name': self.part_name,
            'part_number': self.part_number,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': self.total_price,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }