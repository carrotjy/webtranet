from flask import Blueprint, request, jsonify
from app.models.service_report import ServiceReport
from app.database.init_db import get_db_connection

public_service_report_bp = Blueprint('public_service_report', __name__)


@public_service_report_bp.route('/<token>', methods=['GET'])
def get_public_service_report(token):
    """고객 공개 서비스 리포트 조회 (인증 불필요)"""
    try:
        report = ServiceReport.get_by_public_token(token)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        parts = report.get_parts()
        time_records = report.get_time_records()

        return jsonify({
            'report': {
                'id': report.id,
                'report_number': report.report_number,
                'customer_name': getattr(report, 'customer_name', None),
                'customer_address': getattr(report, 'customer_address', None),
                'service_date': report.service_date,
                'technician_name': getattr(report, 'technician_name', None),
                'machine_model': report.machine_model,
                'machine_serial': report.machine_serial,
                'problem_description': report.problem_description,
                'solution_description': report.solution_description,
                'used_parts': [p.to_dict() for p in parts],
                'time_records': [t.to_dict() for t in time_records],
                'has_signature': bool(report.customer_signature),
                'customer_signed_at': report.customer_signed_at,
                'signer_name': getattr(report, 'signer_name', None),
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'조회 중 오류가 발생했습니다: {str(e)}'}), 500


@public_service_report_bp.route('/<token>/signature', methods=['POST'])
def submit_signature(token):
    """고객 서명 저장 (인증 불필요, 1회만 가능)"""
    try:
        report = ServiceReport.get_by_public_token(token)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        if report.customer_signature:
            return jsonify({'error': '이미 서명이 완료된 레포트입니다.'}), 409

        data = request.get_json()
        signature_data = data.get('signature', '')
        signer_name = data.get('signer_name', '').strip() if data.get('signer_name') else None
        if not signature_data or not signature_data.startswith('data:image/'):
            return jsonify({'error': '유효하지 않은 서명 데이터입니다.'}), 400

        conn = get_db_connection()
        try:
            conn.execute(
                'UPDATE service_reports SET customer_signature=?, customer_signed_at=CURRENT_TIMESTAMP, signer_name=? WHERE public_token=?',
                (signature_data, signer_name, token)
            )
            conn.commit()
            return jsonify({'message': '서명이 저장되었습니다.'}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': f'서명 저장 중 오류가 발생했습니다: {str(e)}'}), 500
