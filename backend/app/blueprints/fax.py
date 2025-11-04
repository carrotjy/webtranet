"""
Fax Blueprint
팩스 전송 관련 API 엔드포인트
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.database.db import get_db_connection
import win32print
import win32api
import os
import tempfile

fax_bp = Blueprint('fax', __name__)


@fax_bp.route('/fax/send', methods=['POST'])
@jwt_required()
def send_fax():
    """PDF 파일을 팩스로 전송"""
    try:
        data = request.get_json()
        invoice_id = data.get('invoice_id')
        customer_name = data.get('customer_name')

        if not invoice_id or not customer_name:
            return jsonify({
                'success': False,
                'message': '거래명세표 ID와 고객명이 필요합니다.'
            }), 400

        conn = get_db_connection()

        # 팩스 프린터 설정 확인
        fax_printer_setting = conn.execute(
            "SELECT value FROM system_settings WHERE key = 'fax_printer'"
        ).fetchone()

        if not fax_printer_setting:
            conn.close()
            return jsonify({
                'success': False,
                'message': '팩스 프린터가 설정되지 않았습니다. 시스템 설정에서 팩스 프린터를 선택해주세요.'
            }), 400

        fax_printer = fax_printer_setting['value']

        # 고객 팩스번호 조회
        customer = conn.execute(
            "SELECT fax FROM customers WHERE name = ?",
            (customer_name,)
        ).fetchone()

        if not customer or not customer['fax']:
            conn.close()
            return jsonify({
                'success': False,
                'message': '고객의 팩스번호가 등록되지 않았습니다.'
            }), 400

        fax_number = customer['fax']

        # PDF 파일 경로 확인
        pdf_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'invoices',
            f'invoice_{invoice_id}.pdf'
        )

        if not os.path.exists(pdf_path):
            conn.close()
            return jsonify({
                'success': False,
                'message': 'PDF 파일이 생성되지 않았습니다.'
            }), 404

        # 팩스 전송
        # Note: 실제 팩스 전송은 프린터 드라이버에 따라 다를 수 있습니다
        # 여기서는 기본적인 Windows 인쇄 방식을 사용합니다
        try:
            # 프린터 핸들 가져오기
            hprinter = win32print.OpenPrinter(fax_printer)

            try:
                # 인쇄 작업 시작
                job_info = win32print.StartDocPrinter(hprinter, 1, (
                    f"Invoice_{invoice_id}_Fax",
                    None,
                    "RAW"
                ))

                # 팩스 전송 로그 저장
                conn.execute(
                    """INSERT INTO fax_logs
                       (invoice_id, customer_name, fax_number, status, created_at)
                       VALUES (?, ?, ?, 'sending', CURRENT_TIMESTAMP)""",
                    (invoice_id, customer_name, fax_number)
                )
                conn.commit()

                # PDF를 프린터로 전송
                # Note: 실제 구현에서는 PDF를 프린터 포맷으로 변환 필요
                win32api.ShellExecute(
                    0,
                    "printto",
                    pdf_path,
                    f'"{fax_printer}"',
                    ".",
                    0
                )

                win32print.EndDocPrinter(hprinter)

                return jsonify({
                    'success': True,
                    'message': f'{fax_number}로 팩스 전송을 시작했습니다.',
                    'fax_number': fax_number
                }), 200

            finally:
                win32print.ClosePrinter(hprinter)

        except Exception as e:
            # 전송 실패 로그 저장
            conn.execute(
                """INSERT INTO fax_logs
                   (invoice_id, customer_name, fax_number, status, error_message, created_at)
                   VALUES (?, ?, ?, 'failed', ?, CURRENT_TIMESTAMP)""",
                (invoice_id, customer_name, fax_number, str(e))
            )
            conn.commit()
            raise e

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'팩스 전송 실패: {str(e)}'
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()


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
