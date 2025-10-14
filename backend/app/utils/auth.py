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

def service_report_update_required(f):
    """서비스 리포트 수정 권한 체크 데코레이터
    - service_report_update 권한이 있으면 모든 리포트 수정 가능
    - 권한이 없어도 본인이 작성한 리포트는 수정 가능
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        from app.models.service_report import ServiceReport
        
        current_user_id = get_jwt_identity()
        user = User.get_by_id(int(current_user_id))
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        # 관리자는 모든 권한 허용
        if user.is_admin:
            return f(*args, **kwargs)
        
        # 서비스 리포트 기본 접근 권한 확인
        if not user.service_report_access:
            return jsonify({'error': '서비스 리포트 페이지에 접근할 권한이 없습니다.'}), 403
        
        # report_id 파라미터 추출
        report_id = kwargs.get('report_id')
        if not report_id:
            return jsonify({'error': '리포트 ID가 필요합니다.'}), 400
        
        # 서비스 리포트 수정(update) 권한이 있으면 모든 리포트 수정 가능
        if user.service_report_update:
            return f(*args, **kwargs)
        
        # 수정 권한이 없어도 본인이 작성한 리포트는 수정 가능
        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404
        
        # 작성자(technician_id)가 본인인지 확인
        if report.technician_id == user.id:
            return f(*args, **kwargs)
        
        return jsonify({'error': '이 서비스 리포트를 수정할 권한이 없습니다. 본인이 작성한 리포트만 수정할 수 있습니다.'}), 403
    
    return decorated_function

def get_current_user():
    """현재 로그인한 사용자 정보를 반환"""
    try:
        current_user_id = get_jwt_identity()
        if current_user_id:
            return User.get_by_id(int(current_user_id))
        return None
    except:
        return None