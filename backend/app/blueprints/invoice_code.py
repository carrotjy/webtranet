from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required
from app.models.invoice_code import InvoiceCode
from app.utils.auth import admin_required
import sqlite3

invoice_code_bp = Blueprint('invoice_code', __name__)

# CORS preflight 요청 처리
@invoice_code_bp.route('/admin/invoice-codes', methods=['OPTIONS'])
def handle_preflight_admin():
    """Admin Invoice 코드 경로에 대한 CORS preflight 처리"""
    response = make_response('', 200)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@invoice_code_bp.route('/invoice-codes', methods=['OPTIONS'])
def handle_preflight_all():
    """Invoice 코드 경로에 대한 CORS preflight 처리"""
    response = make_response('', 200)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@invoice_code_bp.route('/admin/invoice-codes', methods=['GET'])
@admin_required
def get_invoice_codes():
    """Invoice 코드 목록 조회 (관리자 전용)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        
        from app.database.init_db import get_db_connection
        conn = get_db_connection()
        
        # 검색 조건 적용 (is_active 필터 제거)
        where_clause = "WHERE 1=1"
        params = []
        
        if search:
            where_clause += " AND (code LIKE ? OR description LIKE ?)"
            search_param = f'%{search}%'
            params.extend([search_param, search_param])
        
        # 총 개수 조회
        count_query = f"SELECT COUNT(*) FROM invoice_codes {where_clause}"
        total = conn.execute(count_query, params).fetchone()[0]
        
        # 페이징 적용하여 데이터 조회
        offset = (page - 1) * per_page
        data_query = f"""
            SELECT * FROM invoice_codes {where_clause}
            ORDER BY code
            LIMIT ? OFFSET ?
        """
        params.extend([per_page, offset])
        
        invoice_codes = conn.execute(data_query, params).fetchall()
        conn.close()
        
        # 결과 변환
        result = []
        for code in invoice_codes:
            result.append({
                'id': code['id'],
                'code': code['code'],
                'description': code['description'],
                'category': code['category'],
                'created_at': code['created_at'],
                'updated_at': code['updated_at']
            })
        
        return jsonify({
            'invoice_codes': result,
            'total': total,
            'page': page,
            'pages': (total + per_page - 1) // per_page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Invoice 코드 조회 실패: {str(e)}'}), 500

@invoice_code_bp.route('/admin/invoice-codes', methods=['POST'])
@admin_required
def create_invoice_code():
    """새 Invoice 코드 생성 (관리자 전용)"""
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        description = data.get('description', '').strip()
        category = data.get('category', '').strip() if data.get('category') else None
        
        # 유효성 검사
        if not code or not description:
            return jsonify({'error': '코드와 설명은 필수 입력 항목입니다.'}), 400
        
        # 3자리 숫자 검증
        if not (len(code) == 3 and code.isdigit()):
            return jsonify({'error': '코드는 3자리 숫자여야 합니다.'}), 400
        
        from app.database.init_db import get_db_connection
        conn = get_db_connection()
        
        try:
            # 중복 검사
            existing = conn.execute(
                'SELECT id FROM invoice_codes WHERE code = ?', 
                (code,)
            ).fetchone()
            
            if existing:
                return jsonify({'error': '이미 존재하는 코드입니다.'}), 400
            
            # 새 Invoice 코드 생성
            cursor = conn.execute('''
                INSERT INTO invoice_codes (code, description, category)
                VALUES (?, ?, ?)
            ''', (code, description, category))
            
            conn.commit()
            
            # 생성된 데이터 반환
            new_id = cursor.lastrowid
            new_code = conn.execute(
                'SELECT * FROM invoice_codes WHERE id = ?', 
                (new_id,)
            ).fetchone()
            
            result = {
                'id': new_code['id'],
                'code': new_code['code'],
                'description': new_code['description'],
                'category': new_code['category'],
                'created_at': new_code['created_at'],
                'updated_at': new_code['updated_at']
            }
            
            return jsonify(result), 201
            
        except sqlite3.IntegrityError as e:
            return jsonify({'error': '코드 생성 중 데이터베이스 오류가 발생했습니다.'}), 400
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'error': f'Invoice 코드 생성 실패: {str(e)}'}), 500

@invoice_code_bp.route('/admin/invoice-codes/<int:code_id>', methods=['PUT'])
@admin_required
def update_invoice_code(code_id):
    """Invoice 코드 수정 (관리자 전용)"""
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        description = data.get('description', '').strip()
        category = data.get('category', '').strip() if data.get('category') else None
        
        # 유효성 검사
        if not code or not description:
            return jsonify({'error': '코드와 설명은 필수 입력 항목입니다.'}), 400
        
        # 3자리 숫자 검증
        if not (len(code) == 3 and code.isdigit()):
            return jsonify({'error': '코드는 3자리 숫자여야 합니다.'}), 400
        
        from app.database.init_db import get_db_connection
        conn = get_db_connection()
        
        try:
            # 존재하는 코드인지 확인
            existing = conn.execute(
                'SELECT id FROM invoice_codes WHERE id = ?', 
                (code_id,)
            ).fetchone()
            
            if not existing:
                return jsonify({'error': '존재하지 않는 Invoice 코드입니다.'}), 404
            
            # 중복 검사 (자기 자신 제외)
            duplicate = conn.execute(
                'SELECT id FROM invoice_codes WHERE code = ? AND id != ?', 
                (code, code_id)
            ).fetchone()
            
            if duplicate:
                return jsonify({'error': '이미 존재하는 코드입니다.'}), 400
            
            # Invoice 코드 업데이트
            conn.execute('''
                UPDATE invoice_codes SET 
                code = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (code, description, category, code_id))
            
            conn.commit()
            
            # 업데이트된 데이터 반환
            updated_code = conn.execute(
                'SELECT * FROM invoice_codes WHERE id = ?', 
                (code_id,)
            ).fetchone()
            
            result = {
                'id': updated_code['id'],
                'code': updated_code['code'],
                'description': updated_code['description'],
                'category': updated_code['category'],
                'created_at': updated_code['created_at'],
                'updated_at': updated_code['updated_at']
            }
            
            return jsonify(result), 200
            
        except sqlite3.IntegrityError as e:
            return jsonify({'error': '코드 수정 중 데이터베이스 오류가 발생했습니다.'}), 400
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'error': f'Invoice 코드 수정 실패: {str(e)}'}), 500

@invoice_code_bp.route('/admin/invoice-codes/<int:code_id>', methods=['DELETE'])
@admin_required
def delete_invoice_code(code_id):
    """Invoice 코드 삭제 (실제 삭제, 관리자 전용)"""
    try:
        from app.database.init_db import get_db_connection
        conn = get_db_connection()
        
        try:
            # 존재하는 코드인지 확인
            existing = conn.execute(
                'SELECT id FROM invoice_codes WHERE id = ?', 
                (code_id,)
            ).fetchone()
            
            if not existing:
                return jsonify({'error': '존재하지 않는 Invoice 코드입니다.'}), 404
            
            # 사용 중인 코드인지 확인
            in_use = conn.execute(
                'SELECT id FROM service_reports WHERE invoice_code_id = ? LIMIT 1', 
                (code_id,)
            ).fetchone()
            
            if in_use:
                return jsonify({'error': '사용 중인 Invoice 코드는 삭제할 수 없습니다.'}), 400
            
            # 실제 삭제
            conn.execute('DELETE FROM invoice_codes WHERE id = ?', (code_id,))
            
            conn.commit()
            
            return jsonify({'message': 'Invoice 코드가 삭제되었습니다.'}), 200
            
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'error': f'Invoice 코드 삭제 실패: {str(e)}'}), 500

@invoice_code_bp.route('/invoice-codes', methods=['GET'])
@jwt_required()
def get_all_invoice_codes():
    """모든 Invoice 코드 목록 조회 (모든 사용자)"""
    try:
        from app.database.init_db import get_db_connection
        conn = get_db_connection()
        
        invoice_codes = conn.execute('''
            SELECT id, code, description 
            FROM invoice_codes 
            ORDER BY code
        ''').fetchall()
        
        conn.close()
        
        result = []
        for code in invoice_codes:
            result.append({
                'id': code['id'],
                'code': code['code'],
                'description': code['description']
            })
        
        return jsonify({'invoice_codes': result}), 200
        
    except Exception as e:
        return jsonify({'error': f'Invoice 코드 조회 실패: {str(e)}'}), 500