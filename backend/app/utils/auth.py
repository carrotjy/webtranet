from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User

def admin_required(f):
    """관리자 권한이 필요한 엔드포인트에 사용하는 데코레이터"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.get_by_id(int(current_user_id))
        
        if not user or not user.is_admin:
            return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def permission_required(permission_type):
    """특정 페이지 접근 권한이 필요한 엔드포인트에 사용하는 데코레이터"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.get_by_id(int(current_user_id))
            
            if not user:
                return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
            
            # 관리자는 모든 권한 허용
            if user.is_admin:
                return f(*args, **kwargs)
            
            # 권한 확인
            has_permission = False
            if permission_type == 'service_report' and user.service_report_access:
                has_permission = True
            elif permission_type == 'transaction' and user.transaction_access:
                has_permission = True
            elif permission_type == 'customer' and user.customer_access:
                has_permission = True
            elif permission_type == 'spare_parts' and user.spare_parts_access:
                has_permission = True
            
            if not has_permission:
                return jsonify({'error': f'{permission_type} 페이지에 접근할 권한이 없습니다.'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_current_user():
    """현재 로그인한 사용자 정보를 반환"""
    try:
        current_user_id = get_jwt_identity()
        if current_user_id:
            return User.get_by_id(int(current_user_id))
        return None
    except:
        return None