from flask import Blueprint, request, jsonify
from app.utils.auth import permission_required
from app.models.transaction import Transaction

transaction_bp = Blueprint('transaction', __name__)

@transaction_bp.route('/', methods=['GET'])
@permission_required('transaction')
def get_transactions():
    """거래명세서 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        keyword = request.args.get('keyword')
        customer_id = request.args.get('customer_id', type=int)
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if keyword or customer_id or status or start_date or end_date:
            transactions, total = Transaction.search(
                keyword=keyword,
                customer_id=customer_id,
                status=status,
                start_date=start_date,
                end_date=end_date,
                page=page,
                per_page=per_page
            )
        else:
            transactions, total = Transaction.get_all(page=page, per_page=per_page)
        
        return jsonify({
            'transactions': [transaction.to_dict() for transaction in transactions],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }), 200
    except Exception as e:
        return jsonify({'error': f'거래명세서 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@transaction_bp.route('/<int:transaction_id>', methods=['GET'])
@permission_required('transaction')
def get_transaction(transaction_id):
    """특정 거래명세서 조회"""
    try:
        transaction = Transaction.get_by_id(transaction_id)
        if not transaction:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404
        
        return jsonify({'transaction': transaction.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': f'거래명세서 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@transaction_bp.route('/', methods=['POST'])
@permission_required('transaction')
def create_transaction():
    """새 거래명세서 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 확인
        required_fields = ['customer_id', 'transaction_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        transaction = Transaction(
            customer_id=data['customer_id'],
            service_report_id=data.get('service_report_id'),
            transaction_date=data['transaction_date'],
            total_amount=float(data.get('total_amount', 0)),
            status=data.get('status', 'pending'),
            notes=data.get('notes', '')
        )
        
        transaction_id = transaction.save()
        if transaction_id:
            return jsonify({
                'message': '거래명세서가 성공적으로 생성되었습니다.',
                'transaction': transaction.to_dict()
            }), 201
        else:
            return jsonify({'error': '거래명세서 생성에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'거래명세서 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@transaction_bp.route('/from-service-report', methods=['POST'])
@permission_required('transaction')
def create_transaction_from_service_report():
    """서비스 리포트를 기반으로 거래명세서 자동 생성"""
    try:
        data = request.get_json()
        
        service_report_id = data.get('service_report_id')
        labor_cost = float(data.get('labor_cost', 0))
        additional_notes = data.get('additional_notes', '')
        
        if not service_report_id:
            return jsonify({'error': '서비스 리포트 ID가 필요합니다.'}), 400
        
        transaction = Transaction.create_from_service_report(
            service_report_id=service_report_id,
            labor_cost=labor_cost,
            additional_notes=additional_notes
        )
        
        return jsonify({
            'message': '서비스 리포트를 기반으로 거래명세서가 성공적으로 생성되었습니다.',
            'transaction': transaction.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'거래명세서 자동 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@transaction_bp.route('/<int:transaction_id>', methods=['PUT'])
@permission_required('transaction')
def update_transaction(transaction_id):
    """거래명세서 수정"""
    try:
        transaction = Transaction.get_by_id(transaction_id)
        if not transaction:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 필드 업데이트
        transaction.customer_id = data.get('customer_id', transaction.customer_id)
        transaction.service_report_id = data.get('service_report_id', transaction.service_report_id)
        transaction.transaction_date = data.get('transaction_date', transaction.transaction_date)
        transaction.total_amount = float(data.get('total_amount', transaction.total_amount))
        transaction.status = data.get('status', transaction.status)
        transaction.notes = data.get('notes', transaction.notes)
        
        if transaction.save():
            return jsonify({
                'message': '거래명세서가 성공적으로 수정되었습니다.',
                'transaction': transaction.to_dict()
            }), 200
        else:
            return jsonify({'error': '거래명세서 수정에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'거래명세서 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@transaction_bp.route('/<int:transaction_id>', methods=['DELETE'])
@permission_required('transaction')
def delete_transaction(transaction_id):
    """거래명세서 삭제"""
    try:
        transaction = Transaction.get_by_id(transaction_id)
        if not transaction:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404
        
        if transaction.delete():
            return jsonify({'message': '거래명세서가 성공적으로 삭제되었습니다.'}), 200
        else:
            return jsonify({'error': '거래명세서 삭제에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'거래명세서 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

@transaction_bp.route('/<int:transaction_id>/status', methods=['PUT'])
@permission_required('transaction')
def update_transaction_status(transaction_id):
    """거래명세서 상태 변경"""
    try:
        transaction = Transaction.get_by_id(transaction_id)
        if not transaction:
            return jsonify({'error': '거래명세서를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': '새로운 상태값이 필요합니다.'}), 400
        
        valid_statuses = ['pending', 'completed', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({'error': f'유효하지 않은 상태값입니다. 가능한 값: {", ".join(valid_statuses)}'}), 400
        
        transaction.status = new_status
        
        if transaction.save():
            return jsonify({
                'message': '거래명세서 상태가 성공적으로 변경되었습니다.',
                'transaction': transaction.to_dict()
            }), 200
        else:
            return jsonify({'error': '거래명세서 상태 변경에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'거래명세서 상태 변경 중 오류가 발생했습니다: {str(e)}'}), 500