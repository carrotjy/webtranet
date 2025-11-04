"""
Fax Blueprint
팩스 전송 관련 API 엔드포인트
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
import win32print
import win32api
import sqlite3
import os
import tempfile
import glob

fax_bp = Blueprint('fax', __name__)


def get_db_connection():
    """시스템 설정용 데이터베이스 연결 (webtranet.db)"""
    db_path = os.path.join('app', 'database', 'webtranet.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_db_connection():
    """사용자/고객 데이터베이스 연결 (user.db)"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


@fax_bp.route('/fax/send', methods=['POST'])
@jwt_required()
def send_fax():
    """PDF 파일을 팩스 앱으로 열고 팩스번호 반환 (반자동 전송)"""
    try:
        data = request.get_json()
        invoice_id = data.get('invoice_id')
        customer_name = data.get('customer_name')

        if not invoice_id or not customer_name:
            return jsonify({
                'success': False,
                'message': '거래명세표 ID와 고객명이 필요합니다.'
            }), 400

        # 고객 팩스번호 조회 (user.db에서)
        user_conn = get_user_db_connection()
        customer = user_conn.execute(
            "SELECT fax FROM customers WHERE company_name = ?",
            (customer_name,)
        ).fetchone()
        user_conn.close()

        if not customer or not customer['fax']:
            return jsonify({
                'success': False,
                'message': '고객의 팩스번호가 등록되지 않았습니다.'
            }), 400

        fax_number = customer['fax']

        # PDF 파일 경로 확인
        pdf_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'instance',
            '거래명세서',
            customer_name
        )

        # 거래명세서({customer_name}).pdf 패턴으로 파일 찾기
        pdf_pattern = os.path.join(pdf_dir, f'거래명세서({customer_name}).pdf')
        pdf_files = glob.glob(pdf_pattern)

        if not pdf_files:
            return jsonify({
                'success': False,
                'message': f'PDF 파일이 생성되지 않았습니다. 먼저 PDF를 생성해주세요.'
            }), 404

        # 가장 최근 파일 사용
        pdf_path = max(pdf_files, key=os.path.getmtime)

        # 시스템 설정에서 팩스 프린터 조회
        sys_conn = get_db_connection()
        fax_printer_setting = sys_conn.execute(
            "SELECT value FROM system_settings WHERE key = 'fax_printer'"
        ).fetchone()
        sys_conn.close()

        fax_printer = fax_printer_setting['value'] if fax_printer_setting else None

        if not fax_printer:
            return jsonify({
                'success': False,
                'message': '팩스 프린터가 설정되지 않았습니다. 관리자 메뉴 > 시스템 설정에서 팩스 프린터를 설정해주세요.'
            }), 400

        # PDF를 지정된 팩스 프린터로 출력
        try:
            # 팩스 프린터로 PDF 인쇄 (팩스 앱이 열림)
            win32api.ShellExecute(
                0,
                "printto",
                pdf_path,
                f'"{fax_printer}"',
                ".",
                0
            )

            # 로그 저장
            conn = get_db_connection()
            conn.execute(
                """INSERT INTO fax_logs
                   (invoice_id, customer_name, fax_number, status, created_at)
                   VALUES (?, ?, ?, 'manual', CURRENT_TIMESTAMP)""",
                (invoice_id, customer_name, fax_number)
            )
            conn.commit()
            conn.close()

            # 프린터 이름에서 앱 이름 추출 (예: "HP Fax" -> "HP", "Brother Fax" -> "Brother")
            app_name = fax_printer.split()[0] if fax_printer else "팩스"

            return jsonify({
                'success': True,
                'message': f'{app_name} 팩스 앱이 열렸습니다. 팩스번호를 붙여넣고 전송 버튼을 눌러주세요.',
                'fax_number': fax_number,
                'pdf_path': pdf_path,
                'fax_printer': fax_printer
            }), 200

        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'팩스 앱 실행 실패: {str(e)}\n프린터: {fax_printer}'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'팩스 준비 실패: {str(e)}'
        }), 500


@fax_bp.route('/fax/status/<int:invoice_id>', methods=['GET'])
@jwt_required()
def get_fax_status(invoice_id):
    """팩스 전송 상태 조회"""
    try:
        conn = get_db_connection()

        fax_log = conn.execute(
            """SELECT * FROM fax_logs
               WHERE invoice_id = ?
               ORDER BY created_at DESC
               LIMIT 1""",
            (invoice_id,)
        ).fetchone()

        conn.close()

        if not fax_log:
            return jsonify({
                'success': True,
                'status': None
            }), 200

        return jsonify({
            'success': True,
            'status': fax_log['status'],
            'fax_number': fax_log['fax_number'],
            'created_at': fax_log['created_at'],
            'error_message': fax_log.get('error_message')
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'상태 조회 실패: {str(e)}'
        }), 500


@fax_bp.route('/fax/number/<customer_name>', methods=['GET'])
@jwt_required()
def get_fax_number(customer_name):
    """고객의 팩스번호 조회"""
    try:
        from urllib.parse import unquote
        customer_name = unquote(customer_name)

        conn = get_user_db_connection()
        customer = conn.execute(
            "SELECT fax FROM customers WHERE company_name = ?",
            (customer_name,)
        ).fetchone()
        conn.close()

        if not customer:
            return jsonify({
                'success': False,
                'message': '고객 정보를 찾을 수 없습니다.'
            }), 404

        return jsonify({
            'success': True,
            'fax_number': customer['fax'] if customer['fax'] else None
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'팩스번호 조회 실패: {str(e)}'
        }), 500
