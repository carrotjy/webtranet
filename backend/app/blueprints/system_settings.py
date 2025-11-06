"""
System Settings Blueprint
시스템 설정 관련 API 엔드포인트
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
import win32print
import win32api
import sqlite3
import os

system_settings_bp = Blueprint('system_settings', __name__)


def get_db_connection():
    """데이터베이스 연결"""
    db_path = os.path.join('app', 'database', 'webtranet.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


@system_settings_bp.route('/system/printers', methods=['GET'])
@jwt_required()
def get_printers():
    """설치된 프린터 목록 조회 (관리자만 가능)"""
    try:
        # 현재 사용자 확인
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        # Windows 프린터 목록 가져오기
        printers = []
        printer_enum = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)

        for printer in printer_enum:
            printer_name = printer[2]  # Printer name
            printers.append({
                'name': printer_name,
                'is_default': printer_name == win32print.GetDefaultPrinter()
            })

        return jsonify({
            'success': True,
            'printers': printers
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'프린터 목록 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/fax-printer', methods=['GET'])
@jwt_required()
def get_fax_printer():
    """저장된 팩스 프린터 설정 조회"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        conn = get_db_connection()
        setting = conn.execute(
            "SELECT value FROM system_settings WHERE key = 'fax_printer'"
        ).fetchone()
        conn.close()

        return jsonify({
            'success': True,
            'fax_printer': setting['value'] if setting else None
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'팩스 프린터 설정 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/fax-printer', methods=['POST'])
@jwt_required()
def set_fax_printer():
    """팩스 프린터 설정 저장"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        data = request.get_json()
        printer_name = data.get('printer_name')

        if not printer_name:
            return jsonify({
                'success': False,
                'message': '프린터 이름이 필요합니다.'
            }), 400

        conn = get_db_connection()

        # 기존 설정 확인
        existing = conn.execute(
            "SELECT * FROM system_settings WHERE key = 'fax_printer'"
        ).fetchone()

        if existing:
            # 업데이트
            conn.execute(
                "UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'fax_printer'",
                (printer_name,)
            )
        else:
            # 새로 생성
            conn.execute(
                "INSERT INTO system_settings (key, value) VALUES ('fax_printer', ?)",
                (printer_name,)
            )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': '팩스 프린터가 설정되었습니다.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'팩스 프린터 설정 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/libreoffice-path', methods=['GET'])
@jwt_required()
def get_libreoffice_path():
    """저장된 LibreOffice 경로 설정 조회"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        conn = get_db_connection()
        setting = conn.execute(
            "SELECT value FROM system_settings WHERE key = 'libreoffice_path'"
        ).fetchone()
        conn.close()

        return jsonify({
            'success': True,
            'libreoffice_path': setting['value'] if setting else None
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'LibreOffice 경로 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/libreoffice-path', methods=['POST'])
@jwt_required()
def set_libreoffice_path():
    """LibreOffice 경로 설정 저장"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        data = request.get_json()
        libreoffice_path = data.get('libreoffice_path')

        if not libreoffice_path:
            return jsonify({
                'success': False,
                'message': 'LibreOffice 경로가 필요합니다.'
            }), 400

        # 경로 유효성 검증
        if not os.path.exists(libreoffice_path):
            return jsonify({
                'success': False,
                'message': '입력한 경로가 존재하지 않습니다. 경로를 확인해주세요.'
            }), 400

        conn = get_db_connection()

        # 기존 설정 확인
        existing = conn.execute(
            "SELECT * FROM system_settings WHERE key = 'libreoffice_path'"
        ).fetchone()

        if existing:
            # 업데이트
            conn.execute(
                "UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'libreoffice_path'",
                (libreoffice_path,)
            )
        else:
            # 새로 생성
            conn.execute(
                "INSERT INTO system_settings (key, value) VALUES ('libreoffice_path', ?)",
                (libreoffice_path,)
            )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'LibreOffice 경로가 설정되었습니다.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'LibreOffice 경로 설정 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/info-history', methods=['GET'])
@jwt_required()
def get_system_info_history():
    """시스템 정보 이력 조회"""
    try:
        conn = get_db_connection()

        # system_info_history 테이블이 없으면 생성
        conn.execute('''
            CREATE TABLE IF NOT EXISTS system_info_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version TEXT NOT NULL,
                description TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        ''')
        conn.commit()

        # 이력 조회 (최신순)
        history = conn.execute('''
            SELECT
                sih.id,
                sih.title,
                sih.version,
                sih.description,
                sih.created_at,
                u.name as created_by_name
            FROM system_info_history sih
            LEFT JOIN users u ON sih.created_by = u.id
            ORDER BY sih.created_at DESC
        ''').fetchall()

        conn.close()

        return jsonify({
            'success': True,
            'history': [dict(row) for row in history]
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'시스템 정보 이력 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/info-history', methods=['POST'])
@jwt_required()
def add_system_info():
    """시스템 정보 추가 (관리자만 가능)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        data = request.get_json()
        title = data.get('title')
        version = data.get('version')
        description = data.get('description', '')

        if not title or not version:
            return jsonify({
                'success': False,
                'message': '시스템 이름과 버전은 필수입니다.'
            }), 400

        conn = get_db_connection()

        # system_info_history 테이블이 없으면 생성
        conn.execute('''
            CREATE TABLE IF NOT EXISTS system_info_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version TEXT NOT NULL,
                description TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        ''')

        # 새 이력 추가
        conn.execute('''
            INSERT INTO system_info_history (title, version, description, created_by)
            VALUES (?, ?, ?, ?)
        ''', (title, version, description, current_user_id))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': '시스템 정보가 추가되었습니다.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'시스템 정보 추가 실패: {str(e)}'
        }), 500
