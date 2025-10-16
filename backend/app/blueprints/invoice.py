from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.service_report import ServiceReport
from app.utils.auth import admin_required

invoice_bp = Blueprint('invoice', __name__)

# CORS preflight 요청 처리
@invoice_bp.route('/invoices', methods=['OPTIONS'])
@invoice_bp.route('/invoices/<int:invoice_id>', methods=['OPTIONS'])
@invoice_bp.route('/admin/invoices', methods=['OPTIONS'])
@invoice_bp.route('/admin/invoices/<int:invoice_id>', methods=['OPTIONS'])
@invoice_bp.route('/invoices/from-service-report/<int:service_report_id>', methods=['OPTIONS'])
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
    """거래명세표 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        invoices, total = Invoice.get_all(page, per_page)
        
        result = []
        for invoice in invoices:
            result.append(invoice.to_dict())
        
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
                'message': '이미 거래명세표가 생성되어 있습니다.',
                'invoice_id': existing_invoice.id
            }), 200
        
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
        
        # 금액 재계산
        if 'items' in data:
            # 기존 항목들 삭제
            InvoiceItem.delete_by_invoice_id(invoice_id)
            
            work_subtotal = 0
            travel_subtotal = 0
            parts_subtotal = 0
            
            # 새 항목들 저장
            for item_data in data['items']:
                item = InvoiceItem(
                    invoice_id=invoice_id,
                    item_type=item_data['item_type'],
                    description=item_data['description'],
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    total_price=item_data['quantity'] * item_data['unit_price']
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

        # 거래명세서 번호 자동 생성
        invoice_number = Invoice._generate_invoice_number()

        # 거래명세서 생성
        invoice = Invoice(
            service_report_id=data.get('service_report_id'),
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
            notes=data.get('notes')
        )

        invoice_id = invoice.save()

        # 거래명세서 항목 저장
        if 'items' in data:
            invoice.save_items(data['items'])

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