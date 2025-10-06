from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.invoice_rate import InvoiceRate
from app.utils.auth import admin_required

invoice_rate_bp = Blueprint('invoice_rate', __name__)

# CORS preflight 요청 처리
@invoice_rate_bp.route('/admin/invoice-rates', methods=['OPTIONS'])
def handle_preflight():
    """Invoice 요율 경로에 대한 CORS preflight 처리"""
    return '', 200

@invoice_rate_bp.route('/admin/invoice-rates', methods=['GET'])
@admin_required
def get_invoice_rates():
    """Invoice 요율 설정 조회 (관리자 전용)"""
    try:
        rate_setting = InvoiceRate.get_current_setting()
        return jsonify(rate_setting.to_dict()), 200
    except Exception as e:
        return jsonify({'error': f'요율 설정 조회 실패: {str(e)}'}), 500

@invoice_rate_bp.route('/admin/invoice-rates', methods=['POST'])
@admin_required
def update_invoice_rates():
    """Invoice 요율 설정 업데이트 (관리자 전용)"""
    try:
        data = request.get_json()
        work_rate = data.get('work_rate', 50000)
        travel_rate = data.get('travel_rate', 30000)
        
        # 유효성 검사
        if work_rate < 0 or travel_rate < 0:
            return jsonify({'error': '요율은 0 이상이어야 합니다.'}), 400
        
        # 현재 설정 가져오기 또는 새로 생성
        rate_setting = InvoiceRate.get_current_setting()
        rate_setting.work_rate = work_rate
        rate_setting.travel_rate = travel_rate
        
        rate_setting.save()
        
        return jsonify(rate_setting.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': f'요율 설정 저장 실패: {str(e)}'}), 500