from flask import Blueprint, request, jsonify
from app.models.user import User
from app.utils.auth import admin_required, get_current_user

user_mgmt_bp = Blueprint('user_management', __name__)

@user_mgmt_bp.route('/', methods=['GET'])
@admin_required
def get_all_users():
    """모든 사용자 목록 조회 (관리자만)"""
    try:
        users = User.get_all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        return jsonify({'error': '사용자 목록 조회 중 오류가 발생했습니다.'}), 500

@user_mgmt_bp.route('/technicians', methods=['GET'])
def get_technicians():
    """기술부 직원 목록 조회"""
    try:
        users = User.get_by_department('기술부')
        return jsonify({
            'technicians': [{'id': user.id, 'name': user.name} for user in users]
        }), 200
    except Exception as e:
        return jsonify({'error': '기술부 직원 목록 조회 중 오류가 발생했습니다.'}), 500

@user_mgmt_bp.route('/', methods=['POST'])
@admin_required
def create_user():
    """새 사용자 생성 (관리자만)"""
    try:
        data = request.get_json()
        
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        # 이메일 중복 확인
        if User.get_by_email(data['email']):
            return jsonify({'error': '이미 존재하는 이메일입니다.'}), 400
        
        user = User(
            name=data['name'],
            email=data['email'],
            password=data['password'],
            contact=data.get('contact', ''),
            department=data.get('department', ''),
            service_report_access=data.get('service_report_access', False),
            transaction_access=data.get('transaction_access', False),
            customer_access=data.get('customer_access', False),
            spare_parts_access=data.get('spare_parts_access', False),
            resource_access=data.get('resource_access', False),
            is_admin=data.get('is_admin', False),
            # 서비스 리포트 CRUD 권한
            service_report_create=data.get('service_report_create', False),
            service_report_read=data.get('service_report_read', False),
            service_report_update=data.get('service_report_update', False),
            service_report_delete=data.get('service_report_delete', False),
            # 리소스 CRUD 권한
            resource_create=data.get('resource_create', False),
            resource_read=data.get('resource_read', False),
            resource_update=data.get('resource_update', False),
            resource_delete=data.get('resource_delete', False),
            # 고객정보 CRUD 권한
            customer_create=data.get('customer_create', False),
            customer_read=data.get('customer_read', False),
            customer_update=data.get('customer_update', False),
            customer_delete=data.get('customer_delete', False),
            # 거래명세서 CRUD 권한
            transaction_create=data.get('transaction_create', False),
            transaction_read=data.get('transaction_read', False),
            transaction_update=data.get('transaction_update', False),
            transaction_delete=data.get('transaction_delete', False),
            # 부품 CRUD 권한
            spare_parts_create=data.get('spare_parts_create', False),
            spare_parts_read=data.get('spare_parts_read', False),
            spare_parts_update=data.get('spare_parts_update', False),
            spare_parts_delete_crud=data.get('spare_parts_delete_crud', False)
        )
        
        user_id = user.save()
        if user_id:
            return jsonify({
                'message': '사용자가 성공적으로 생성되었습니다.',
                'user': user.to_dict()
            }), 201
        else:
            return jsonify({'error': '사용자 생성에 실패했습니다.'}), 500
            
    except Exception as e:
        print(f"사용자 생성 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'사용자 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@user_mgmt_bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """사용자 정보 수정 (관리자만)"""
    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 이메일 중복 확인 (자신 제외)
        if data.get('email') and data['email'] != user.email:
            existing_user = User.get_by_email(data['email'])
            if existing_user:
                return jsonify({'error': '이미 존재하는 이메일입니다.'}), 400
        
        # 필드 업데이트
        user.name = data.get('name', user.name)
        user.email = data.get('email', user.email)
        user.contact = data.get('contact', user.contact)
        user.department = data.get('department', user.department)
        
        # 비밀번호 업데이트 (입력된 경우에만)
        if data.get('password') and data['password'].strip():
            user.password = data['password']  # User 모델에서 해싱 처리
            
        user.service_report_access = data.get('service_report_access', user.service_report_access)
        user.transaction_access = data.get('transaction_access', user.transaction_access)
        user.customer_access = data.get('customer_access', user.customer_access)
        user.spare_parts_access = data.get('spare_parts_access', user.spare_parts_access)
        user.resource_access = data.get('resource_access', getattr(user, 'resource_access', False))
        user.is_admin = data.get('is_admin', user.is_admin)
        
        # 서비스 리포트 CRUD 권한 업데이트
        user.service_report_create = data.get('service_report_create', getattr(user, 'service_report_create', False))
        user.service_report_read = data.get('service_report_read', getattr(user, 'service_report_read', False))
        user.service_report_update = data.get('service_report_update', getattr(user, 'service_report_update', False))
        user.service_report_delete = data.get('service_report_delete', getattr(user, 'service_report_delete', False))
        
        # 리소스 CRUD 권한 업데이트
        user.resource_create = data.get('resource_create', getattr(user, 'resource_create', False))
        user.resource_read = data.get('resource_read', getattr(user, 'resource_read', False))
        user.resource_update = data.get('resource_update', getattr(user, 'resource_update', False))
        user.resource_delete = data.get('resource_delete', getattr(user, 'resource_delete', False))
        
        # 고객정보 CRUD 권한 업데이트
        user.customer_create = data.get('customer_create', getattr(user, 'customer_create', False))
        user.customer_read = data.get('customer_read', getattr(user, 'customer_read', False))
        user.customer_update = data.get('customer_update', getattr(user, 'customer_update', False))
        user.customer_delete = data.get('customer_delete', getattr(user, 'customer_delete', False))
        
        # 거래명세서 CRUD 권한 업데이트
        user.transaction_create = data.get('transaction_create', getattr(user, 'transaction_create', False))
        user.transaction_read = data.get('transaction_read', getattr(user, 'transaction_read', False))
        user.transaction_update = data.get('transaction_update', getattr(user, 'transaction_update', False))
        user.transaction_delete = data.get('transaction_delete', getattr(user, 'transaction_delete', False))
        
        # 부품 CRUD 권한 업데이트
        user.spare_parts_create = data.get('spare_parts_create', getattr(user, 'spare_parts_create', False))
        user.spare_parts_read = data.get('spare_parts_read', getattr(user, 'spare_parts_read', False))
        user.spare_parts_update = data.get('spare_parts_update', getattr(user, 'spare_parts_update', False))
        user.spare_parts_delete_crud = data.get('spare_parts_delete_crud', getattr(user, 'spare_parts_delete_crud', False))
        
        if user.save():
            return jsonify({
                'message': '사용자 정보가 성공적으로 수정되었습니다.',
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': '사용자 정보 수정에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': '사용자 정보 수정 중 오류가 발생했습니다.'}), 500

@user_mgmt_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """사용자 삭제 (관리자만)"""
    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        # 자기 자신은 삭제할 수 없음
        current_user = get_current_user()
        if current_user.id == user_id:
            return jsonify({'error': '자기 자신은 삭제할 수 없습니다.'}), 400
        
        if user.delete():
            return jsonify({'message': '사용자가 성공적으로 삭제되었습니다.'}), 200
        else:
            return jsonify({'error': '사용자 삭제에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': '사용자 삭제 중 오류가 발생했습니다.'}), 500

@user_mgmt_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@admin_required
def reset_user_password(user_id):
    """사용자 비밀번호 초기화 (관리자만)"""
    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        new_password = data.get('new_password')
        
        if not new_password:
            return jsonify({'error': '새 비밀번호를 입력해주세요.'}), 400
        
        if user.update_password(new_password):
            return jsonify({'message': '비밀번호가 성공적으로 초기화되었습니다.'}), 200
        else:
            return jsonify({'error': '비밀번호 초기화에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': '비밀번호 초기화 중 오류가 발생했습니다.'}), 500