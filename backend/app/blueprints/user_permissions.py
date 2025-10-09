from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime

user_permissions_bp = Blueprint('user_permissions', __name__)

def get_db_connection():
    """데이터베이스 연결"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@user_permissions_bp.route('/user-permissions', methods=['GET'])
def get_all_user_permissions():
    """모든 사용자의 스페어파트 권한 조회"""
    try:
        conn = get_db_connection()
        
        # users 테이블에서 직접 권한 정보 조회
        users = conn.execute('''
            SELECT 
                id as user_id,
                name as username,
                department as role,
                COALESCE(spare_parts_edit, 1) as can_edit,
                COALESCE(spare_parts_delete, 1) as can_delete,
                COALESCE(spare_parts_stock_in, 1) as can_inbound,
                COALESCE(spare_parts_stock_out, 1) as can_outbound
            FROM users
            ORDER BY id
        ''').fetchall()
        
        conn.close()
        
        users_list = []
        for user in users:
            users_list.append({
                'userId': user['user_id'],
                'username': user['username'],
                'role': user['role'] or '사용자',
                'canEdit': bool(user['can_edit']),
                'canDelete': bool(user['can_delete']),
                'canInbound': bool(user['can_inbound']),
                'canOutbound': bool(user['can_outbound'])
            })
        
        return jsonify({
            'success': True,
            'data': users_list
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'서버 오류: {str(e)}'
        }), 500

@user_permissions_bp.route('/user-permissions/<int:user_id>', methods=['GET'])
def get_user_permissions(user_id):
    """특정 사용자의 스페어파트 권한 조회"""
    try:
        conn = get_db_connection()
        
        user_permission = conn.execute('''
            SELECT 
                id as user_id,
                name as username,
                department as role,
                COALESCE(spare_parts_edit, 1) as can_edit,
                COALESCE(spare_parts_delete, 1) as can_delete,
                COALESCE(spare_parts_stock_in, 1) as can_inbound,
                COALESCE(spare_parts_stock_out, 1) as can_outbound
            FROM users
            WHERE id = ?
        ''', (user_id,)).fetchone()
        
        conn.close()
        
        if not user_permission:
            return jsonify({
                'success': False,
                'message': '사용자를 찾을 수 없습니다.'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'userId': user_permission['user_id'],
                'username': user_permission['username'],
                'role': user_permission['role'] or '사용자',
                'canEdit': bool(user_permission['can_edit']),
                'canDelete': bool(user_permission['can_delete']),
                'canInbound': bool(user_permission['can_inbound']),
                'canOutbound': bool(user_permission['can_outbound'])
            }
        })
        
    except Exception as e:
        print(f"Error in get_user_permissions: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'서버 오류: {str(e)}'
        }), 500

@user_permissions_bp.route('/user-permissions/<int:user_id>', methods=['PUT'])
def update_user_permissions(user_id):
    """특정 사용자의 스페어파트 권한 업데이트"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': '요청 데이터가 없습니다.'
            }), 400
        
        can_edit = data.get('canEdit', False)
        can_delete = data.get('canDelete', False)
        can_inbound = data.get('canInbound', False)
        can_outbound = data.get('canOutbound', False)
        
        conn = get_db_connection()
        
        # 사용자 존재 확인
        user = conn.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({
                'success': False,
                'message': '사용자를 찾을 수 없습니다.'
            }), 404
        
        # users 테이블에서 직접 권한 업데이트
        conn.execute('''
            UPDATE users 
            SET spare_parts_edit = ?, spare_parts_delete = ?, spare_parts_stock_in = ?, spare_parts_stock_out = ?
            WHERE id = ?
        ''', (can_edit, can_delete, can_inbound, can_outbound, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '권한이 성공적으로 업데이트되었습니다.'
        })
        
    except Exception as e:
        print(f"Error in update_user_permissions: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'서버 오류: {str(e)}'
        }), 500

@user_permissions_bp.route('/user-permissions/batch', methods=['PUT'])
def update_batch_user_permissions():
    """여러 사용자의 스페어파트 권한 일괄 업데이트"""
    try:
        data = request.get_json()
        
        if not data or 'users' not in data:
            return jsonify({
                'success': False,
                'message': '요청 데이터가 올바르지 않습니다.'
            }), 400
        
        users_permissions = data['users']
        
        conn = get_db_connection()
        
        for user_perm in users_permissions:
            user_id = user_perm.get('userId')
            can_edit = user_perm.get('canEdit', False)
            can_delete = user_perm.get('canDelete', False)
            can_inbound = user_perm.get('canInbound', False)
            can_outbound = user_perm.get('canOutbound', False)
            
            # 사용자 존재 확인
            user = conn.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                continue  # 존재하지 않는 사용자는 건너뛰기
            
            # users 테이블에서 직접 권한 업데이트
            conn.execute('''
                UPDATE users 
                SET spare_parts_edit = ?, spare_parts_delete = ?, spare_parts_stock_in = ?, spare_parts_stock_out = ?
                WHERE id = ?
            ''', (can_edit, can_delete, can_inbound, can_outbound, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '모든 권한이 성공적으로 업데이트되었습니다.'
        })
        
    except Exception as e:
        print(f"Error in update_batch_user_permissions: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'서버 오류: {str(e)}'
        }), 500