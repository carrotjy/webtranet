from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User
from app.utils.auth import get_current_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """로그인 API"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': '이메일과 비밀번호를 입력해주세요.'}), 400
        
        user = User.get_by_email(email)
        
        if user and user.check_password(password):
            access_token = create_access_token(identity=str(user.id))
            return jsonify({
                'access_token': access_token,
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401
            
    except Exception as e:
        return jsonify({'error': '로그인 중 오류가 발생했습니다.'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_info():
    """현재 로그인한 사용자 정보 조회"""
    try:
        user = get_current_user()
        if user:
            return jsonify({'user': user.to_dict()}), 200
        else:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
    except Exception as e:
        return jsonify({'error': '사용자 정보 조회 중 오류가 발생했습니다.'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """비밀번호 변경"""
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': '현재 비밀번호와 새 비밀번호를 입력해주세요.'}), 400
        
        user = get_current_user()
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        if not user.check_password(current_password):
            return jsonify({'error': '현재 비밀번호가 올바르지 않습니다.'}), 400
        
        if user.update_password(new_password):
            return jsonify({'message': '비밀번호가 성공적으로 변경되었습니다.'}), 200
        else:
            return jsonify({'error': '비밀번호 변경에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': '비밀번호 변경 중 오류가 발생했습니다.'}), 500