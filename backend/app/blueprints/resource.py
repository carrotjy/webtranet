from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.resource import Resource
from app.utils.auth import permission_required

resource_bp = Blueprint('resource', __name__)

@resource_bp.route('', methods=['GET'])
# @jwt_required()  # 임시로 주석 처리
def get_resources():
    """모든 리소스 조회"""
    try:
        customer_id = request.args.get('customer_id')
        include_customer = request.args.get('include_customer', 'false').lower() == 'true'
        
        if customer_id:
            resources = Resource.get_by_customer_id(int(customer_id))
            return jsonify([resource.to_dict() for resource in resources]), 200
        elif include_customer:
            # 고객 정보와 함께 조회
            resources = Resource.get_all_with_customer_info()
            return jsonify(resources), 200
        else:
            resources = Resource.get_all()
            return jsonify([resource.to_dict() for resource in resources]), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@resource_bp.route('/<int:resource_id>', methods=['GET'])
# @jwt_required()  # 임시로 주석 처리
def get_resource(resource_id):
    """특정 리소스 조회"""
    try:
        resource = Resource.get_by_id(resource_id)
        
        if not resource:
            return jsonify({'error': '리소스를 찾을 수 없습니다.'}), 404
        
        return jsonify(resource.to_dict()), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@resource_bp.route('', methods=['POST'])
# @permission_required('customer')  # 임시로 주석 처리
def create_resource():
    """새 리소스 생성"""
    try:
        data = request.get_json()
        print(f"[DEBUG] 받은 데이터: {data}")
        
        # 필수 필드 검증
        required_fields = ['customer_id', 'category', 'serial_number', 'product_name']
        for field in required_fields:
            value = data.get(field)
            print(f"[DEBUG] {field}: {value} (타입: {type(value)})")
            if not value:
                print(f"[ERROR] {field}가 비어있거나 누락됨")
                return jsonify({'error': f'{field}는 필수 입력 항목입니다.'}), 400
        
        resource = Resource.from_dict(data)
        resource.save()
        
        return jsonify(resource.to_dict()), 201
    
    except Exception as e:
        print(f"[ERROR] 리소스 생성 중 오류: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@resource_bp.route('/<int:resource_id>', methods=['PUT'])
# @permission_required('customer')  # 임시로 주석 처리
def update_resource(resource_id):
    """리소스 정보 수정"""
    try:
        resource = Resource.get_by_id(resource_id)
        
        if not resource:
            return jsonify({'error': '리소스를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 수정할 수 있는 필드들
        updatable_fields = ['category', 'serial_number', 'product_name', 'note', 'management_history']
        for field in updatable_fields:
            if field in data:
                setattr(resource, field, data[field])
        
        resource.save()
        
        return jsonify(resource.to_dict()), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@resource_bp.route('/<int:resource_id>', methods=['DELETE'])
# @permission_required('customer')  # 임시로 주석 처리
def delete_resource(resource_id):
    """리소스 삭제"""
    try:
        resource = Resource.get_by_id(resource_id)
        
        if not resource:
            return jsonify({'error': '리소스를 찾을 수 없습니다.'}), 404
        
        resource.delete()
        
        return jsonify({'message': '리소스가 삭제되었습니다.'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500