#!/usr/bin/env python3
"""API를 통한 PDF 생성 테스트 - WeasyPrint vs LibreOffice 비교"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from datetime import datetime

app = create_app()

# 테스트 데이터
test_data = {
    'customer_name': 'WeasyPrint테스트',
    'service_date': '2025-01-24',
    'customer_info': {
        'company_name': 'WeasyPrint 테스트 고객사',
        'address': '서울시 강남구 테헤란로 123',
        'phone': '02-1234-5678',
        'fax': '02-1234-5679'
    },
    'items': [
        {'month': 1, 'day': 24, 'item_name': '서버 호스팅', 'specification': 'AWS EC2',
         'quantity': 1, 'unit_price': 100000, 'total_price': 100000, 'vat': 10000},
        {'month': 1, 'day': 25, 'item_name': '라이센스', 'specification': '연간',
         'quantity': 5, 'unit_price': 50000, 'total_price': 250000, 'vat': 25000},
    ]
}

with app.app_context():
    from app.blueprints.invoice_generator import (
        copy_template_file,
        prepare_sheet_from_template,
        write_header_info_to_sheet,
        write_invoice_items_to_sheet,
        apply_thick_border_to_range,
        calculate_total_amount,
        convert_to_pdf_weasyprint,
        convert_excel_to_pdf_libreoffice,
        HAS_WEASYPRINT,
        get_or_create_invoice_file
    )

    print(f"\n{'='*60}")
    print(f"WeasyPrint 활성화 여부: {HAS_WEASYPRINT}")
    print(f"{'='*60}\n")

    customer_name = test_data['customer_name']
    service_date = test_data['service_date']
    items = test_data['items']
    customer_info = test_data['customer_info']

    # 날짜 형식 변환
    date_obj = datetime.strptime(service_date, '%Y-%m-%d')
    sheet_name = date_obj.strftime('%y%m%d')

    # Excel 파일 생성
    print("1. Excel 파일 생성 중...")
    workbook, invoice_file_path = copy_template_file(customer_name)
    customer_sheet, supplier_sheet = prepare_sheet_from_template(workbook, sheet_name)

    total_amount = calculate_total_amount(items)

    for sheet in [customer_sheet, supplier_sheet]:
        write_header_info_to_sheet(sheet, service_date, customer_info, total_amount)
        write_invoice_items_to_sheet(sheet, items)
        apply_thick_border_to_range(sheet, 'B3', 'AG43')

    workbook.save(invoice_file_path)
    workbook.close()
    print(f"   ✓ Excel 파일 저장: {invoice_file_path}")

    # PDF 생성 테스트
    pdf_filename = f'거래명세표({customer_name})-{sheet_name}.pdf'
    pdf_path = os.path.join(os.path.dirname(invoice_file_path), pdf_filename)

    print(f"\n2. WeasyPrint PDF 생성 테스트...")
    if HAS_WEASYPRINT:
        pdf_success = convert_to_pdf_weasyprint(
            items, service_date, customer_info, total_amount, pdf_path
        )
        print(f"   WeasyPrint 결과: {'성공' if pdf_success else '실패'}")
        if pdf_success:
            print(f"   ✓ PDF 파일: {pdf_path}")
            print(f"   ✓ 파일 크기: {os.path.getsize(pdf_path):,} bytes")
    else:
        print("   WeasyPrint가 비활성화되어 있습니다.")

    # LibreOffice로 다시 생성 (비교용)
    pdf_path_libreoffice = pdf_path.replace('.pdf', '-libreoffice.pdf')
    print(f"\n3. LibreOffice PDF 생성 테스트 (비교용)...")
    customer_sheet_name = f"{sheet_name}-c"
    supplier_sheet_name = f"{sheet_name}-s"
    sheet_names = [customer_sheet_name, supplier_sheet_name]

    pdf_success_lo = convert_excel_to_pdf_libreoffice(
        invoice_file_path, pdf_path_libreoffice, sheet_names
    )
    print(f"   LibreOffice 결과: {'성공' if pdf_success_lo else '실패'}")
    if pdf_success_lo:
        print(f"   ✓ PDF 파일: {pdf_path_libreoffice}")
        print(f"   ✓ 파일 크기: {os.path.getsize(pdf_path_libreoffice):,} bytes")

    print(f"\n{'='*60}")
    print("완료! 두 PDF 파일을 비교해보세요.")
    print(f"{'='*60}\n")
