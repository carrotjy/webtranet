#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app.models.service_report import ServiceReport
import json

def test_support_technician_feature():
    """support_technician_ids 기능 테스트"""
    
    print("=== ServiceReport support_technician_ids 기능 테스트 ===")
    
    # 테스트 데이터 생성
    test_report = ServiceReport(
        customer_id=1,
        technician_id=1, 
        service_date='2024-01-15',
        problem_description='테스트 문제',
        solution_description='테스트 해결',
        support_technician_ids=json.dumps([2, 3])
    )
    
    print("1. ServiceReport 객체 생성 성공")
    print(f"   support_technician_ids (원본): {test_report.support_technician_ids}")
    
    # to_dict 테스트
    test_dict = test_report.to_dict()
    print("2. to_dict 변환 성공")
    print(f"   support_technician_ids (변환됨): {test_dict.get('support_technician_ids', [])}")
    print(f"   타입: {type(test_dict.get('support_technician_ids', []))}")
    
    # None 값 테스트
    test_report_none = ServiceReport(
        customer_id=1,
        technician_id=1,
        service_date='2024-01-15',
        problem_description='테스트 문제 2',
        support_technician_ids=None
    )
    
    test_dict_none = test_report_none.to_dict()
    print("3. None 값 테스트 성공")
    print(f"   support_technician_ids (None): {test_dict_none.get('support_technician_ids', [])}")
    
    print("=== 테스트 완료! ===")

if __name__ == "__main__":
    test_support_technician_feature()