"""
System Settings Blueprint
시스템 설정 관련 API 엔드포인트
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.database.db import get_db_connection
import win32print
import win32api

system_settings_bp = Blueprint('system_settings', __name__)


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
