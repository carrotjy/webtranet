from flask import Blueprint, request, jsonify
from app.utils.auth import permission_required
from app.models.spare_part import SparePart

spare_parts_bp = Blueprint('spare_parts', __name__)

@spare_parts_bp.route('/', methods=['GET'])
@permission_required('spare_parts')
def get_spare_parts():
    """스페어파트 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        keyword = request.args.get('keyword')
        low_stock_only = request.args.get('low_stock_only', 'false').lower() == 'true'
        
        if keyword or low_stock_only:
            parts, total = SparePart.search(
                keyword=keyword,
                low_stock_only=low_stock_only,
                page=page,
                per_page=per_page
            )
        else:
            parts, total = SparePart.get_all(page=page, per_page=per_page)
        
        return jsonify({
            'spare_parts': [part.to_dict() for part in parts],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }), 200
    except Exception as e:
        return jsonify({'error': f'스페어파트 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@spare_parts_bp.route('/low-stock', methods=['GET'])
@permission_required('spare_parts')
def get_low_stock_parts():
    """재고 부족 스페어파트 조회"""
    try:
        parts = SparePart.get_low_stock_parts()
        
        return jsonify({
            'spare_parts': [part.to_dict() for part in parts],
            'count': len(parts)
        }), 200
    except Exception as e:
        return jsonify({'error': f'재고 부족 스페어파트 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@spare_parts_bp.route('/<int:part_id>', methods=['GET'])
@permission_required('spare_parts')
def get_spare_part(part_id):
    """특정 스페어파트 조회"""
    try:
        part = SparePart.get_by_id(part_id)
        if not part:
            return jsonify({'error': '스페어파트를 찾을 수 없습니다.'}), 404
        
        return jsonify({'spare_part': part.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': f'스페어파트 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@spare_parts_bp.route('/', methods=['POST'])
@permission_required('spare_parts')
def create_spare_part():
    """새 스페어파트 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 확인
        required_fields = ['part_number', 'part_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        part = SparePart(
            part_number=data['part_number'],
            part_name=data['part_name'],
            description=data.get('description', ''),
            price=float(data.get('price', 0)),
            stock_quantity=int(data.get('stock_quantity', 0)),
            minimum_stock=int(data.get('minimum_stock', 0)),
            supplier=data.get('supplier', '')
        )
        
        part_id = part.save()
        if part_id:
            return jsonify({
                'message': '스페어파트가 성공적으로 생성되었습니다.',
                'spare_part': part.to_dict()
            }), 201
        else:
            return jsonify({'error': '스페어파트 생성에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'스페어파트 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@spare_parts_bp.route('/<int:part_id>', methods=['PUT'])
@permission_required('spare_parts')
def update_spare_part(part_id):
    """스페어파트 수정"""
    try:
        part = SparePart.get_by_id(part_id)
        if not part:
            return jsonify({'error': '스페어파트를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 부품 번호 중복 확인 (자신 제외)
        if data.get('part_number') and data['part_number'] != part.part_number:
            existing_part = SparePart.get_by_part_number(data['part_number'])
            if existing_part:
                return jsonify({'error': '이미 존재하는 부품 번호입니다.'}), 400
        
        # 필드 업데이트
        part.part_number = data.get('part_number', part.part_number)
        part.part_name = data.get('part_name', part.part_name)
        part.description = data.get('description', part.description)
        part.price = float(data.get('price', part.price))
        part.stock_quantity = int(data.get('stock_quantity', part.stock_quantity))
        part.minimum_stock = int(data.get('minimum_stock', part.minimum_stock))
        part.supplier = data.get('supplier', part.supplier)
        
        if part.save():
            return jsonify({
                'message': '스페어파트가 성공적으로 수정되었습니다.',
                'spare_part': part.to_dict()
            }), 200
        else:
            return jsonify({'error': '스페어파트 수정에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'스페어파트 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@spare_parts_bp.route('/<int:part_id>', methods=['DELETE'])
@permission_required('spare_parts')
def delete_spare_part(part_id):
    """스페어파트 삭제"""
    try:
        part = SparePart.get_by_id(part_id)
        if not part:
            return jsonify({'error': '스페어파트를 찾을 수 없습니다.'}), 404
        
        if part.delete():
            return jsonify({'message': '스페어파트가 성공적으로 삭제되었습니다.'}), 200
        else:
            return jsonify({'error': '스페어파트 삭제에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'스페어파트 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

@spare_parts_bp.route('/<int:part_id>/stock', methods=['PUT'])
@permission_required('spare_parts')
def update_stock(part_id):
    """재고 수량 업데이트"""
    try:
        part = SparePart.get_by_id(part_id)
        if not part:
            return jsonify({'error': '스페어파트를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        quantity_change = data.get('quantity_change')
        operation = data.get('operation', 'set')  # 'add', 'subtract', 'set'
        
        if quantity_change is None:
            return jsonify({'error': '수량 변경값이 필요합니다.'}), 400
        
        quantity_change = int(quantity_change)
        
        if part.update_stock(quantity_change, operation):
            return jsonify({
                'message': '재고가 성공적으로 업데이트되었습니다.',
                'spare_part': part.to_dict()
            }), 200
        else:
            return jsonify({'error': '재고 업데이트에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'재고 업데이트 중 오류가 발생했습니다: {str(e)}'}), 500