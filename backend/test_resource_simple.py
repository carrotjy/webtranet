import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import sqlite3
from datetime import datetime
from typing import List, Dict, Optional

class Resource:
    def __init__(self, id=None, customer_id=None, category=None, serial_number=None, 
                 product_name=None, note=None, created_at=None, updated_at=None, management_history=None):
        self.id = id
        self.customer_id = customer_id
        self.category = category
        self.serial_number = serial_number
        self.product_name = product_name
        self.note = note
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
        self.management_history = management_history or []

    @classmethod
    def get_by_customer_id(cls, customer_id: int) -> List['Resource']:
        """고객 ID로 리소스 목록 조회"""
        conn = sqlite3.connect('app/database/user.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM resources WHERE customer_id = ? ORDER BY created_at DESC', (customer_id,))
        rows = cursor.fetchall()
        
        resources = []
        for row in rows:
            # 관리 이력도 함께 조회
            cursor.execute('''
            SELECT date, content FROM resource_management_history 
            WHERE resource_id = ? ORDER BY date DESC
            ''', (row[0],))  # row[0]은 resource id
            history_rows = cursor.fetchall()
            
            management_history = []
            for hist_row in history_rows:
                management_history.append({
                    'date': hist_row[0],
                    'content': hist_row[1]
                })
            
            # 데이터베이스 스키마에 맞는 순서로 Resource 객체 생성
            resource = cls(
                id=row[0],
                customer_id=row[1], 
                category=row[2],
                serial_number=row[3],
                product_name=row[4],
                note=row[5],
                created_at=row[6],
                updated_at=row[7],
                management_history=management_history
            )
            resources.append(resource)
        
        conn.close()
        return resources

    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'category': self.category,
            'serial_number': self.serial_number,
            'product_name': self.product_name,
            'note': self.note,
            'management_history': self.management_history,
            'created_at': str(self.created_at) if self.created_at else ''
        }

# 테스트: 고객 ID 42의 리소스 조회
try:
    resources = Resource.get_by_customer_id(42)
    print(f"고객 ID 42의 리소스 개수: {len(resources)}")
    
    for resource in resources:
        print(f"리소스 ID: {resource.id}")
        print(f"카테고리: {resource.category}")
        print(f"시리얼 번호: {resource.serial_number}")
        print(f"제품명: {resource.product_name}")
        print(f"관리 이력: {resource.management_history}")
        print(f"to_dict(): {resource.to_dict()}")
        print("---")
        
except Exception as e:
    print(f"에러 발생: {e}")
    import traceback
    traceback.print_exc()