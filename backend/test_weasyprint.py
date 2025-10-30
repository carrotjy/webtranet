#!/usr/bin/env python3
"""WeasyPrint 테스트 스크립트"""
import os
import sys

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader

# 테스트 데이터
test_items = [
    {'month': 1, 'day': 15, 'item_name': '서버 호스팅', 'specification': 'AWS EC2 t3.medium',
     'quantity': 1, 'unit_price': 100000, 'total_price': 100000, 'vat': 10000, 'isHeader': False, 'isBlank': False},
    {'month': 1, 'day': 16, 'item_name': '소프트웨어 라이센스', 'specification': '연간 구독',
     'quantity': 5, 'unit_price': 50000, 'total_price': 250000, 'vat': 25000, 'isHeader': False, 'isBlank': False},
    {'month': 0, 'day': 0, 'item_name': 'NEGO', 'specification': '', 'quantity': 0,
     'unit_price': 0, 'total_price': -30000, 'vat': -3000, 'isHeader': False, 'isBlank': False},
]

test_customer_info = {
    'company_name': '테스트 고객사',
    'address': '서울시 강남구 테헤란로 123',
    'phone': '02-1234-5678',
    'fax': '02-1234-5679'
}

service_date = '2025-01-15'
total_amount = 352000
total_supply = 320000
total_vat = 32000

# Jinja2 템플릿 로드
template_dir = os.path.join(os.path.dirname(__file__), 'app', 'templates')
env = Environment(loader=FileSystemLoader(template_dir))
template = env.get_template('invoice_template.html')

# 템플릿 렌더링
html_content = template.render(
    service_date=service_date,
    customer_info=test_customer_info,
    items=test_items,
    total_amount=total_amount,
    total_supply=total_supply,
    total_vat=total_vat,
    generation_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
)

# PDF 생성
output_path = os.path.join(os.path.dirname(__file__), 'instance', 'test_weasyprint.pdf')
os.makedirs(os.path.dirname(output_path), exist_ok=True)

print(f"WeasyPrint로 PDF 생성 중...")
print(f"출력 경로: {output_path}")

HTML(string=html_content).write_pdf(output_path)

print(f"✓ PDF 생성 완료: {output_path}")
print(f"  파일 크기: {os.path.getsize(output_path):,} bytes")
