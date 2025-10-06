from flask import Blueprint, request, jsonify
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
    return '', 200

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
        
        print(f"[DEBUG] 서비스 리포트 정보: ID={service_report.id}, 고객명={getattr(service_report, 'customer_name', 'N/A')}")
        
        # 시간기록 확인
        time_records = service_report.get_time_records()
        print(f"[DEBUG] 시간기록 개수: {len(time_records)}")
        for i, tr in enumerate(time_records):
            print(f"[DEBUG] 시간기록 {i+1}: 작업시간={tr.calculated_work_time}, 이동시간={tr.calculated_travel_time}")
        
        # 부품정보 확인
        used_parts = service_report.get_parts()
        print(f"[DEBUG] 부품 개수: {len(used_parts)}")
        for i, part in enumerate(used_parts):
            print(f"[DEBUG] 부품 {i+1}: {part.part_name}, 수량={part.quantity}, 단가={part.unit_price}")
        
        # 거래명세표 생성
        invoice = Invoice.create_from_service_report(service_report)
        invoice_id = invoice.save()
        
        print(f"[DEBUG] 거래명세표 생성됨: ID={invoice_id}")
        
        # 거래명세표 항목들 생성
        items = InvoiceItem.create_from_service_report(invoice_id, service_report)
        print(f"[DEBUG] 생성될 항목 개수: {len(items)}")
        
        for item in items:
            item.save()
            print(f"[DEBUG] 항목 저장: {item.description}, 수량={item.quantity}, 단가={item.unit_price}")
        
        return jsonify({
            'message': '거래명세표가 생성되었습니다.',
            'invoice_id': invoice_id
        }), 201
        
    except Exception as e:
        print(f"[ERROR] 거래명세표 생성 실패: {str(e)}")
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