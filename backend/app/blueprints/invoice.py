from flask import Blueprint, request, jsonify, make_response, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.service_report import ServiceReport
from app.models.invoice_code import InvoiceCode
from app.utils.auth import admin_required
from datetime import date, datetime
import os
import zipfile
import tempfile

invoice_bp = Blueprint('invoice', __name__)

# CORS preflight 요청 처리
@invoice_bp.route('/invoices', methods=['OPTIONS'])
@invoice_bp.route('/invoices/<int:invoice_id>', methods=['OPTIONS'])
@invoice_bp.route('/admin/invoices', methods=['OPTIONS'])
@invoice_bp.route('/admin/invoices/<int:invoice_id>', methods=['OPTIONS'])
@invoice_bp.route('/invoices/from-service-report/<int:service_report_id>', methods=['OPTIONS'])
@invoice_bp.route('/invoices/<int:invoice_id>/lock', methods=['OPTIONS'])
@invoice_bp.route('/invoices/<int:invoice_id>/unlock', methods=['OPTIONS'])
@invoice_bp.route('/invoices/<int:invoice_id>/issue-bill', methods=['OPTIONS'])
@invoice_bp.route('/invoices/<int:invoice_id>/cancel-bill', methods=['OPTIONS'])
@invoice_bp.route('/invoices/bulk-download', methods=['OPTIONS'])
def handle_preflight(*args, **kwargs):
    """Invoice 경로에 대한 CORS preflight 처리"""
    response = make_response('', 200)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@invoice_bp.route('/invoices', methods=['GET'])
@jwt_required()
def get_invoices():
    """거래명세표 목록 조회 (검색 지원)"""
    try:
        import os
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', None, type=str)

        invoices, total = Invoice.get_all(page, per_page, search)

        # instance 폴더 경로
        INSTANCE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance')
        INVOICE_BASE_DIR = os.path.join(INSTANCE_DIR, '거래명세서')

        # 고객 팩스번호 조회를 위한 user.db 연결
        import sqlite3
        user_db_path = os.path.join('app', 'database', 'user.db')
        user_conn = sqlite3.connect(user_db_path)
        user_conn.row_factory = sqlite3.Row

        result = []
        for invoice in invoices:
            invoice_dict = invoice.to_dict()

            # 고객 팩스번호 조회
            customer = user_conn.execute(
                "SELECT fax FROM customers WHERE company_name = ?",
                (invoice.customer_name,)
            ).fetchone()
            invoice_dict['fax_number'] = customer['fax'] if customer and customer['fax'] else None

            # 파일 존재 여부 확인
            customer_folder = os.path.join(INVOICE_BASE_DIR, invoice.customer_name)
            excel_filename = f'거래명세서({invoice.customer_name})-{invoice.invoice_number}.xlsx'
            excel_path = os.path.join(customer_folder, excel_filename)

            # Excel 파일 존재 여부
            invoice_dict['has_excel'] = os.path.exists(excel_path)

            # PDF 파일 존재 여부 - 월별 폴더에서 확인
            # issue_date에서 년월 추출하여 월별 폴더 확인
            has_pdf = False
            if invoice.issue_date:
                try:
                    from datetime import datetime
                    issue_date = datetime.strptime(invoice.issue_date, '%Y-%m-%d')
                    monthly_folder_name = f"{issue_date.year}년{issue_date.month:02d}월"
                    monthly_folder = os.path.join(INVOICE_BASE_DIR, monthly_folder_name)

                    pdf_filename = f"거래명세서({invoice.customer_name})-{invoice.invoice_number}.pdf"
                    pdf_path = os.path.join(monthly_folder, pdf_filename)
                    has_pdf = os.path.exists(pdf_path)
                except:
                    # 날짜 파싱 실패 시 고객 폴더에서 찾기 (하위 호환성)
                    if os.path.exists(customer_folder):
                        for filename in os.listdir(customer_folder):
                            if filename.startswith(f'거래명세서({invoice.customer_name})') and filename.endswith('.pdf'):
                                has_pdf = True
                                break
            invoice_dict['has_pdf'] = has_pdf

            result.append(invoice_dict)

        user_conn.close()

        return jsonify({
            'invoices': result,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        }), 200

    except Exception as e:
        return jsonify({'error': f'거래명세표 목록 조회 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
@jwt_required()
def get_invoice(invoice_id):
    """거래명세표 상세 조회"""
    try:
        invoice = Invoice.get_by_id(invoice_id)
        if not invoice:
            return jsonify({'error': '거래명세표를 찾을 수 없습니다.'}), 404
        
        # 거래명세표 항목들도 함께 조회
        invoice_dict = invoice.to_dict()
        invoice_dict['items'] = [item.to_dict() for item in invoice.get_items()]
        
        return jsonify(invoice_dict), 200
        
    except Exception as e:
        return jsonify({'error': f'거래명세표 조회 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/from-service-report/<int:service_report_id>', methods=['POST'])
@jwt_required()
def create_invoice_from_service_report(service_report_id):
    """서비스 리포트를 기반으로 거래명세표 생성"""
    try:
        # 이미 거래명세표가 생성되어 있는지 확인
        existing_invoice = Invoice.get_by_service_report_id(service_report_id)
        if existing_invoice:
            return jsonify({
                'error': '이미 거래명세서가 존재합니다. 기존 거래명세서를 수정해주세요.',
                'invoice_id': existing_invoice.id,
                'invoice_number': existing_invoice.invoice_number,
                'exists': True
            }), 409  # 409 Conflict

        # 서비스 리포트와 관련 정보 조회
        service_report = ServiceReport.get_by_id(service_report_id)
        if not service_report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        # 시간기록 확인
        time_records = service_report.get_time_records()

        # 부품정보 확인
        used_parts = service_report.get_parts()

        # 거래명세표 생성
        invoice = Invoice.create_from_service_report(service_report)
        invoice_id = invoice.save()

        # 거래명세표 항목들 생성
        items = InvoiceItem.create_from_service_report(invoice_id, service_report)

        for item in items:
            item.save()

        # 서비스 리포트 자동 잠금 처리
        current_user_id = get_jwt_identity()
        service_report.lock(current_user_id)

        return jsonify({
            'message': '거래명세표가 생성되었습니다.',
            'invoice_id': invoice_id
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'거래명세표 생성 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['PUT'])
@jwt_required()
def update_invoice(invoice_id):
    """거래명세표 수정"""
    try:
        invoice = Invoice.get_by_id(invoice_id)
        if not invoice:
            return jsonify({'error': '거래명세표를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 기본 정보 업데이트
        if 'customer_name' in data:
            invoice.customer_name = data['customer_name']
        if 'customer_address' in data:
            invoice.customer_address = data['customer_address']
        if 'issue_date' in data:
            invoice.issue_date = data['issue_date']
        if 'due_date' in data:
            invoice.due_date = data['due_date']
        if 'notes' in data:
            invoice.notes = data['notes']
        if 'invoice_code_id' in data:
            invoice.invoice_code_id = data['invoice_code_id']
        
        # 금액 재계산
        if 'items' in data:
            # 기존 항목들 삭제
            InvoiceItem.delete_by_invoice_id(invoice_id)
            
            work_subtotal = 0
            travel_subtotal = 0
            parts_subtotal = 0
            
            # 새 항목들 저장
            for item_data in data['items']:
                # is_header 값 처리: isHeader(camelCase) 또는 is_header(snake_case) 둘 다 지원
                is_header_value = item_data.get('isHeader', item_data.get('is_header', 0))
                
                # 디버깅: 헤더 행 확인
                if '서비스비용' in str(item_data.get('item_name', '')) or '부품비용' in str(item_data.get('item_name', '')):
                    print(f"[DEBUG] 헤더 행 감지: {item_data.get('item_name')}, is_header={is_header_value}")
                
                item = InvoiceItem(
                    invoice_id=invoice_id,
                    item_type=item_data.get('item_type', 'parts'),
                    description=item_data.get('description', ''),
                    quantity=float(item_data.get('quantity', 0)),
                    unit_price=float(item_data.get('unit_price', 0)),
                    total_price=float(item_data.get('total_price', 0)),
                    month=item_data.get('month'),
                    day=item_data.get('day'),
                    item_name=item_data.get('item_name'),
                    part_number=item_data.get('part_number'),
                    is_header=is_header_value,
                    row_order=item_data.get('row_order', 0)
                )
                item.save()
                
                # 항목별 소계 계산
                if item.item_type == 'work':
                    work_subtotal += item.total_price
                elif item.item_type == 'travel':
                    travel_subtotal += item.total_price
                elif item.item_type == 'parts':
                    parts_subtotal += item.total_price
            
            # 거래명세표 금액 업데이트
            invoice.work_subtotal = work_subtotal
            invoice.travel_subtotal = travel_subtotal
            invoice.parts_subtotal = parts_subtotal
            invoice.total_amount = work_subtotal + travel_subtotal + parts_subtotal
            invoice.vat_amount = invoice.total_amount * 0.1
            invoice.grand_total = invoice.total_amount + invoice.vat_amount
        
        invoice.save()
        
        return jsonify({'message': '거래명세표가 수정되었습니다.'}), 200
        
    except Exception as e:
        return jsonify({'error': f'거래명세표 수정 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices', methods=['POST'])
@jwt_required()
def create_invoice():
    """거래명세서 직접 생성 (거래명세서 모달에서 사용)"""
    try:
        data = request.get_json()

        # 필수 필드 확인
        required_fields = ['customer_id', 'customer_name', 'customer_address', 'issue_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400

        # service_report_id가 있는 경우 중복 체크
        service_report_id = data.get('service_report_id')
        if service_report_id:
            existing_invoice = Invoice.get_by_service_report_id(service_report_id)
            if existing_invoice:
                return jsonify({
                    'error': '이미 거래명세서가 존재합니다. 기존 거래명세서를 수정해주세요.',
                    'invoice_id': existing_invoice.id,
                    'invoice_number': existing_invoice.invoice_number,
                    'exists': True
                }), 409  # 409 Conflict

        # 거래명세서 번호 자동 생성 (발행일자 기준)
        invoice_number = Invoice._generate_invoice_number(data['issue_date'])

        # 거래명세서 생성
        invoice = Invoice(
            service_report_id=service_report_id,
            invoice_number=invoice_number,
            customer_id=data['customer_id'],
            customer_name=data['customer_name'],
            customer_address=data['customer_address'],
            issue_date=data['issue_date'],
            due_date=data.get('due_date'),
            work_subtotal=float(data.get('work_subtotal', 0)),
            travel_subtotal=float(data.get('travel_subtotal', 0)),
            parts_subtotal=float(data.get('parts_subtotal', 0)),
            total_amount=float(data.get('total_amount', 0)),
            vat_amount=float(data.get('vat_amount', 0)),
            grand_total=float(data.get('grand_total', 0)),
            notes=data.get('notes'),
            invoice_code_id=data.get('invoice_code_id')
        )

        invoice_id = invoice.save()

        # 거래명세서 항목 저장
        if 'items' in data:
            invoice.save_items(data['items'])

        # service_report_id가 있는 경우 서비스 리포트 자동 잠금 처리
        if service_report_id:
            service_report = ServiceReport.get_by_id(service_report_id)
            if service_report:
                current_user_id = get_jwt_identity()
                service_report.lock(current_user_id)

        return jsonify({
            'message': '거래명세서가 생성되었습니다.',
            'invoice_id': invoice_id,
            'invoice_number': invoice.invoice_number
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'거래명세서 생성 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['DELETE'])
@admin_required
def delete_invoice(invoice_id):
    """거래명세표 삭제 (관리자 전용)"""
    try:
        invoice = Invoice.get_by_id(invoice_id)
        if not invoice:
            return jsonify({'error': '거래명세표를 찾을 수 없습니다.'}), 404

        Invoice.delete(invoice_id)

        return jsonify({'message': '거래명세표가 삭제되었습니다.'}), 200

    except Exception as e:
        return jsonify({'error': f'거래명세표 삭제 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>/generate-excel', methods=['POST'])
@jwt_required()
def regenerate_excel(invoice_id):
    """거래명세서 Excel 파일 재생성"""
    try:
        from app.blueprints.invoice_generator_v2 import generate_invoice_excel_v2

        result = generate_invoice_excel_v2(invoice_id)

        if result['success']:
            # 파일 다운로드 URL 생성
            invoice = Invoice.get_by_id(invoice_id)
            excel_url = f'/api/invoice-excel/{invoice.customer_name}/{result["filename"]}'

            return jsonify({
                'success': True,
                'message': result['message'],
                'excel_url': excel_url,
                'filename': result['filename']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['message']
            }), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Excel 생성 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>/lock', methods=['POST'])
@jwt_required()
def lock_invoice(invoice_id):
    """거래명세서 잠금"""
    try:
        from app.database.init_db import get_db_connection
        from datetime import datetime

        current_user_id = get_jwt_identity()
        invoice = Invoice.get_by_id(invoice_id)

        if not invoice:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404

        conn = get_db_connection()
        conn.execute('''
            UPDATE invoices
            SET is_locked = 1, locked_by = ?, locked_at = ?
            WHERE id = ?
        ''', (current_user_id, datetime.now().isoformat(), invoice_id))
        conn.commit()
        conn.close()

        return jsonify({'message': '거래명세서가 잠겼습니다.'}), 200

    except Exception as e:
        return jsonify({'error': f'잠금 처리 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>/unlock', methods=['POST'])
@jwt_required()
def unlock_invoice(invoice_id):
    """거래명세서 잠금 해제"""
    try:
        from app.database.init_db import get_db_connection

        invoice = Invoice.get_by_id(invoice_id)

        if not invoice:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404

        conn = get_db_connection()
        conn.execute('''
            UPDATE invoices
            SET is_locked = 0, locked_by = NULL, locked_at = NULL
            WHERE id = ?
        ''', (invoice_id,))
        conn.commit()
        conn.close()

        return jsonify({'message': '거래명세서 잠금이 해제되었습니다.'}), 200

    except Exception as e:
        return jsonify({'error': f'잠금 해제 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>/issue-bill', methods=['POST'])
@jwt_required()
def issue_bill(invoice_id):
    """계산서 발행 처리 (발행 완료 시 자동 잠금)"""
    try:
        from app.database.init_db import get_db_connection
        from datetime import datetime

        current_user_id = get_jwt_identity()
        invoice = Invoice.get_by_id(invoice_id)

        if not invoice:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404

        conn = get_db_connection()
        # 계산서 발행 완료 처리 + 자동 잠금
        conn.execute('''
            UPDATE invoices
            SET bill_status = 'issued',
                bill_issued_at = ?,
                bill_issued_by = ?,
                is_locked = 1,
                locked_by = ?,
                locked_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), current_user_id,
              current_user_id, datetime.now().isoformat(), invoice_id))
        conn.commit()
        conn.close()

        return jsonify({'message': '계산서 발행 완료 처리되었습니다.'}), 200

    except Exception as e:
        return jsonify({'error': f'계산서 발행 처리 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/<int:invoice_id>/cancel-bill', methods=['POST'])
@jwt_required()
def cancel_bill(invoice_id):
    """계산서 발행 취소 처리 (미발행 상태로 변경)"""
    try:
        from app.database.init_db import get_db_connection

        invoice = Invoice.get_by_id(invoice_id)

        if not invoice:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404

        conn = get_db_connection()
        # 계산서 발행 취소 처리
        conn.execute('''
            UPDATE invoices
            SET bill_status = 'pending',
                bill_issued_at = NULL,
                bill_issued_by = NULL
            WHERE id = ?
        ''', (invoice_id,))
        conn.commit()
        conn.close()

        return jsonify({'message': '계산서 발행이 취소되었습니다.'}), 200

    except Exception as e:
        return jsonify({'error': f'계산서 발행 취소 실패: {str(e)}'}), 500

@invoice_bp.route('/invoices/ytd-summary', methods=['GET'])
@jwt_required()
def get_ytd_summary():
    """연도별 카테고리별 월별 비용 집계 (YTD Summary) - 카테고리별 work/travel cost만 집계"""
    try:
        from app.database.init_db import get_db_connection

        year = request.args.get('year', date.today().year, type=int)

        conn = get_db_connection()

        # NULL category 체크
        null_category_check = conn.execute('''
            SELECT COUNT(DISTINCT sr.id)
            FROM service_reports sr
            LEFT JOIN invoice_codes ic ON sr.invoice_code_id = ic.id
            WHERE sr.invoice_code_id IS NULL OR ic.category IS NULL
        ''').fetchone()

        has_null_categories = null_category_check[0] > 0

        # 카테고리별로 work/travel 시간(hours) 집계 (네고 항목 제외)
        # 시간 계산: 네고 항목(total_price < 0)은 아예 무시
        # 금액 계산: 네고 금액은 포함하여 차감 (Labor Total에서 처리)
        # invoice_code_id를 invoices 테이블에서 우선 가져오고, 없으면 service_reports에서 가져옴
        category_query = conn.execute('''
            SELECT
                COALESCE(ic.category, 'Unknown') as category,
                CAST(strftime('%m', i.issue_date) AS INTEGER) as month,
                ii.item_type,
                SUM(CASE WHEN ii.total_price >= 0 THEN ii.quantity ELSE 0 END) as total_hours
            FROM invoice_items ii
            INNER JOIN invoices i ON ii.invoice_id = i.id
            LEFT JOIN service_reports sr ON i.service_report_id = sr.id
            LEFT JOIN invoice_codes ic ON COALESCE(i.invoice_code_id, sr.invoice_code_id) = ic.id
            WHERE i.bill_status = 'issued'
                AND CAST(strftime('%Y', i.issue_date) AS INTEGER) = ?
                AND ii.is_header = 0
                AND ii.item_type IN ('work', 'travel')
            GROUP BY COALESCE(ic.category, 'Unknown'), CAST(strftime('%m', i.issue_date) AS INTEGER), ii.item_type
        ''', (year,)).fetchall()

        # 카테고리별로 데이터 구조화
        category_data_map = {}

        print(f"🔍 YTD category_query 결과 ({len(category_query)}개 행):")
        for row in category_query:
            category = row[0] if row[0] else 'Unknown'
            month = row[1]
            item_type = row[2]
            total_hours = row[3]
            print(f"  Category={category}, Month={month}, Type={item_type}, Hours={total_hours}")

            # 카테고리가 처음 등장하면 초기화
            if category not in category_data_map:
                category_data_map[category] = {
                    'category': category,
                    'description': '',  # 카테고리 번호만 표시
                    'monthly_data': {}
                }
                # 12개월 초기화
                for m in range(1, 13):
                    category_data_map[category]['monthly_data'][str(m)] = {
                        'work': 0,
                        'travel': 0,
                        'parts': 0
                    }

            # 데이터 합산 (시간)
            if month and month >= 1 and month <= 12 and item_type in ['work', 'travel']:
                category_data_map[category]['monthly_data'][str(month)][item_type] += float(total_hours) if total_hours else 0

        # Labor Total: work/travel 비용 총계 (네고 포함)
        labor_monthly_total = {}
        for month in range(1, 13):
            labor_monthly_total[str(month)] = 0

        labor_query = conn.execute('''
            SELECT
                CAST(strftime('%m', i.issue_date) AS INTEGER) as month,
                SUM(ii.total_price) as total
            FROM invoice_items ii
            INNER JOIN invoices i ON ii.invoice_id = i.id
            WHERE i.bill_status = 'issued'
                AND CAST(strftime('%Y', i.issue_date) AS INTEGER) = ?
                AND ii.is_header = 0
                AND ii.item_type IN ('work', 'travel')
            GROUP BY CAST(strftime('%m', i.issue_date) AS INTEGER)
        ''', (year,)).fetchall()

        for row in labor_query:
            month = row[0]
            total = row[1]
            if month >= 1 and month <= 12:
                labor_monthly_total[str(month)] = float(total) if total else 0

        # 부품비용은 카테고리 구분 없이 월별 총계 계산
        parts_monthly_total = {}
        for month in range(1, 13):
            parts_monthly_total[str(month)] = 0

        parts_query = conn.execute('''
            SELECT
                CAST(strftime('%m', i.issue_date) AS INTEGER) as month,
                SUM(ii.total_price) as total
            FROM invoice_items ii
            INNER JOIN invoices i ON ii.invoice_id = i.id
            WHERE i.bill_status = 'issued'
                AND CAST(strftime('%Y', i.issue_date) AS INTEGER) = ?
                AND ii.is_header = 0
                AND ii.item_type = 'parts'
            GROUP BY CAST(strftime('%m', i.issue_date) AS INTEGER)
        ''', (year,)).fetchall()

        for row in parts_query:
            month = row[0]
            total = row[1]
            if month >= 1 and month <= 12:
                parts_monthly_total[str(month)] = float(total) if total else 0

        conn.close()

        # 카테고리 데이터를 리스트로 변환 (카테고리 번호순 정렬)
        category_list = []
        for cat_key in sorted(category_data_map.keys()):
            category_list.append(category_data_map[cat_key])

        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'categories': category_list,
                'labor_monthly_total': labor_monthly_total,
                'parts_monthly_total': parts_monthly_total,
                'has_null_categories': has_null_categories
            }
        }), 200

    except Exception as e:
        import traceback
        print(f"YTD Summary Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'YTD 요약 조회 실패: {str(e)}'
        }), 500


@invoice_bp.route('/invoices/bulk-download', methods=['POST'])
@jwt_required()
def bulk_download_invoices():
    """선택된 거래명세표 파일들을 ZIP으로 일괄 다운로드"""
    try:
        data = request.get_json()
        excel_ids = data.get('excel_ids', [])
        pdf_ids = data.get('pdf_ids', [])

        if not excel_ids and not pdf_ids:
            return jsonify({'error': '다운로드할 파일이 선택되지 않았습니다.'}), 400

        # instance 폴더 경로
        INSTANCE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'instance')
        INVOICE_BASE_DIR = os.path.join(INSTANCE_DIR, '거래명세서')

        # 임시 ZIP 파일 생성
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        zip_filename = temp_zip.name
        temp_zip.close()

        files_added = 0

        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Excel 파일 추가
            for invoice_id in excel_ids:
                invoice = Invoice.get_by_id(invoice_id)
                if not invoice:
                    continue

                customer_folder = os.path.join(INVOICE_BASE_DIR, invoice.customer_name)
                excel_path = os.path.join(customer_folder, f'거래명세서({invoice.customer_name}).xlsx')

                if os.path.exists(excel_path):
                    # ZIP 내부 경로: 거래명세서(고객명).xlsx
                    arcname = f'거래명세서({invoice.customer_name}).xlsx'
                    zipf.write(excel_path, arcname)
                    files_added += 1

            # PDF 파일 추가
            for invoice_id in pdf_ids:
                invoice = Invoice.get_by_id(invoice_id)
                if not invoice:
                    continue

                # 월별 폴더에서 PDF 파일 찾기
                pdf_found = False
                if invoice.issue_date:
                    try:
                        from datetime import datetime
                        issue_date = datetime.strptime(invoice.issue_date, '%Y-%m-%d')
                        monthly_folder_name = f"{issue_date.year}년{issue_date.month:02d}월"
                        monthly_folder = os.path.join(INVOICE_BASE_DIR, monthly_folder_name)

                        pdf_filename = f"거래명세서({invoice.customer_name})-{invoice.invoice_number}.pdf"
                        pdf_path = os.path.join(monthly_folder, pdf_filename)

                        if os.path.exists(pdf_path):
                            zipf.write(pdf_path, pdf_filename)
                            files_added += 1
                            pdf_found = True
                    except:
                        pass

                # 하위 호환성: 월별 폴더에서 못 찾으면 고객 폴더에서 찾기
                if not pdf_found:
                    customer_folder = os.path.join(INVOICE_BASE_DIR, invoice.customer_name)
                    if os.path.exists(customer_folder):
                        for filename in os.listdir(customer_folder):
                            if filename.startswith(f'거래명세서({invoice.customer_name})') and filename.endswith('.pdf'):
                                pdf_path = os.path.join(customer_folder, filename)
                                zipf.write(pdf_path, filename)
                                files_added += 1
                                break

        if files_added == 0:
            # 파일이 하나도 추가되지 않음
            os.unlink(zip_filename)
            return jsonify({'error': '다운로드 가능한 파일이 없습니다.'}), 404

        # ZIP 파일 전송
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        download_filename = f'거래명세서_일괄다운로드_{timestamp}.zip'

        def cleanup():
            """전송 후 임시 파일 삭제"""
            try:
                os.unlink(zip_filename)
            except Exception as e:
                print(f"임시 ZIP 파일 삭제 실패: {e}")

        response = send_file(
            zip_filename,
            mimetype='application/zip',
            as_attachment=True,
            download_name=download_filename
        )

        # 파일 전송 후 삭제 (cleanup은 response가 완료된 후 실행됨)
        # Flask의 send_file은 자동으로 파일을 닫고 정리하지만, 수동 삭제를 위해 after_request 사용 가능
        # 여기서는 간단히 임시 파일 사용 (시스템이 나중에 정리)
        
        return response

    except Exception as e:
        import traceback
        print(f"Bulk download error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'일괄 다운로드 실패: {str(e)}'}), 500