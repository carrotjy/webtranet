from flask import Blueprint, request, jsonify
from app.utils.auth import permission_required, get_current_user, service_report_update_required, admin_required
from app.models.service_report import ServiceReport
from app.database.init_db import get_db_connection

service_report_bp = Blueprint('service_report', __name__)



@service_report_bp.route('/', methods=['GET'])
def get_service_reports():
    """서비스 리포트 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        keyword = request.args.get('keyword')
        customer_id = request.args.get('customer_id', type=int)
        technician_id = request.args.get('technician_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if keyword or customer_id or technician_id or start_date or end_date:
            reports, total = ServiceReport.search(
                keyword=keyword,
                customer_id=customer_id,
                technician_id=technician_id,
                start_date=start_date,
                end_date=end_date,
                page=page,
                per_page=per_page
            )
        else:
            reports, total = ServiceReport.get_all(page=page, per_page=per_page)
        
        return jsonify({
            'reports': [report.to_dict() for report in reports],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'서비스 리포트 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@service_report_bp.route('/<int:report_id>', methods=['GET'])
@permission_required('service_report')
def get_service_report(report_id):
    """특정 서비스 리포트 조회"""
    try:
        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404
        
        return jsonify({'report': report.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': f'서비스 리포트 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@service_report_bp.route('/', methods=['POST'])
@permission_required('service_report')
def create_service_report():
    """새 서비스 리포트 생성"""
    try:
        data = request.get_json()
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({'error': '사용자 인증이 필요합니다.'}), 401
        
        # 필수 필드 확인
        required_fields = ['customer_id', 'service_date', 'problem_description']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        # 기술자가 지정되지 않은 경우 현재 사용자로 설정
        technician_id = data.get('technician_id') or current_user.id
        
        # used_parts 처리 (새로운 별도 테이블 사용)
        parts_used_str = ''
        used_parts_data = []
        if 'used_parts' in data:
            used_parts_list = data['used_parts']
            if isinstance(used_parts_list, list):
                used_parts_data = used_parts_list
                # 하위 호환성을 위한 문자열 버전도 생성
                parts_str_list = []
                for part in used_parts_list:
                    if part.get('part_name'):
                        part_str = f"{part.get('part_name', '')} (수량: {part.get('quantity', 0)})"
                        parts_str_list.append(part_str)
                parts_used_str = ', '.join(parts_str_list)
            else:
                parts_used_str = str(used_parts_list)
        
        # time_records 처리 (새로운 별도 테이블 사용)
        time_records_data = []
        work_hours = 0
        if 'time_records' in data:
            time_records_list = data['time_records']
            if isinstance(time_records_list, list):
                time_records_data = time_records_list
        elif 'time_record' in data and data['time_record']:
            # 단일 time_record를 배열로 변환 (하위 호환성)
            time_records_data = [data['time_record']]
        
        # work_hours 계산 (필요시)
        work_hours = data.get('work_hours', 0)
        
        # support_technician_ids 처리 (JSON 문자열로 저장)
        support_technician_ids = None
        if 'support_technician_ids' in data and data['support_technician_ids']:
            import json
            support_technician_ids = json.dumps(data['support_technician_ids'])
        
        report = ServiceReport(
            customer_id=data['customer_id'],
            technician_id=technician_id,
            machine_model=data.get('machine_model', ''),
            machine_serial=data.get('machine_serial', ''),
            service_date=data['service_date'],
            problem_description=data['problem_description'],
            solution_description=data.get('solution_description', ''),
            parts_used=parts_used_str,  # 하위 호환성을 위해 유지
            work_hours=work_hours,
            status=data.get('status', 'completed'),
            invoice_code_id=data.get('invoice_code_id'),  # Invoice 코드 추가
            support_technician_ids=support_technician_ids
        )
        
        report_id = report.save()
        report_id = report.save()
        
        # 부품 데이터 저장 (새로운 테이블 사용) - 빈 배열도 허용
        if report_id and 'used_parts' in data:
            report.save_parts(used_parts_data)
        
        # 시간기록 데이터 저장 (새로운 테이블 사용) - 빈 배열도 허용
        if report_id and ('time_records' in data or 'time_record' in data):
            report.save_time_records(time_records_data)
        
        if report_id:
            return jsonify({
                'message': '서비스 리포트가 성공적으로 생성되었습니다.',
                'report': report.to_dict()
            }), 201
        else:
            return jsonify({'error': '서비스 리포트 생성에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'서비스 리포트 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@service_report_bp.route('/<int:report_id>', methods=['PUT'])
@service_report_update_required
def update_service_report(report_id):
    """서비스 리포트 수정"""
    try:
        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        # 잠금 상태 확인
        if report.is_locked:
            return jsonify({'error': '이 리포트는 잠금 처리되어 수정할 수 없습니다. 관리자에게 문의하세요.'}), 403

        data = request.get_json()
        
        # 필드 업데이트
        report.customer_id = data.get('customer_id', report.customer_id)
        report.technician_id = data.get('technician_id', report.technician_id)
        report.machine_model = data.get('machine_model', report.machine_model)
        report.machine_serial = data.get('machine_serial', report.machine_serial)
        report.service_date = data.get('service_date', report.service_date)
        report.problem_description = data.get('problem_description', report.problem_description)
        report.solution_description = data.get('solution_description', report.solution_description)
        
        # used_parts 처리 (새로운 별도 테이블 사용)
        used_parts_data = []
        if 'used_parts' in data:
            used_parts_list = data['used_parts']
            if isinstance(used_parts_list, list):
                used_parts_data = used_parts_list
                # 하위 호환성을 위한 문자열 버전도 업데이트
                parts_str_list = []
                for part in used_parts_list:
                    if part.get('part_name'):
                        part_str = f"{part.get('part_name', '')} (수량: {part.get('quantity', 0)})"
                        parts_str_list.append(part_str)
                parts_str = ', '.join(parts_str_list)
                report.parts_used = parts_str
            else:
                report.parts_used = str(used_parts_list)
        
        # time_records 처리 (새로운 별도 테이블 사용)
        time_records_data = []
        if 'time_records' in data:
            time_records_list = data['time_records']
            if isinstance(time_records_list, list):
                time_records_data = time_records_list
        elif 'time_record' in data and data['time_record']:
            # 단일 time_record를 배열로 변환 (하위 호환성)
            time_records_data = [data['time_record']]
        
        # work_hours 업데이트
        report.work_hours = data.get('work_hours', report.work_hours)
        report.status = data.get('status', report.status)
        
        # Invoice 코드 업데이트
        if 'invoice_code_id' in data:
            report.invoice_code_id = data['invoice_code_id']
        
        # support_technician_ids 업데이트
        if 'support_technician_ids' in data:
            import json
            if data['support_technician_ids']:
                report.support_technician_ids = json.dumps(data['support_technician_ids'])
            else:
                report.support_technician_ids = None
        
        if report.save():
            # 부품 데이터 저장 (새로운 테이블 사용) - 빈 배열도 허용하여 기존 데이터 삭제 가능
            if 'used_parts' in data:
                report.save_parts(used_parts_data)
            
            # 시간기록 데이터 저장 (새로운 테이블 사용) - 빈 배열도 허용하여 기존 데이터 삭제 가능
            if 'time_records' in data or 'time_record' in data:
                report.save_time_records(time_records_data)
            
            return jsonify({
                'message': '서비스 리포트가 성공적으로 수정되었습니다.',
                'report': report.to_dict()
            }), 200
        else:
            return jsonify({'error': '서비스 리포트 수정에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'서비스 리포트 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@service_report_bp.route('/<int:report_id>', methods=['DELETE'])
@permission_required('service_report')
def delete_service_report(report_id):
    """서비스 리포트 삭제"""
    try:
        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        if report.delete():
            return jsonify({'message': '서비스 리포트가 성공적으로 삭제되었습니다.'}), 200
        else:
            return jsonify({'error': '서비스 리포트 삭제에 실패했습니다.'}), 500

    except Exception as e:
        return jsonify({'error': f'서비스 리포트 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

@service_report_bp.route('/<int:report_id>/lock', methods=['POST'])
@admin_required
def lock_service_report(report_id):
    """서비스 리포트 잠금 (관리자만 가능)"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': '사용자 인증이 필요합니다.'}), 401

        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        if report.is_locked:
            return jsonify({'error': '이미 잠금 처리된 리포트입니다.'}), 400

        # 잠금 처리
        conn = get_db_connection()
        conn.execute('''
            UPDATE service_reports
            SET is_locked = 1, locked_by = ?, locked_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (current_user.id, report_id))
        conn.commit()
        conn.close()

        return jsonify({
            'message': '서비스 리포트가 잠금 처리되었습니다.',
            'is_locked': True,
            'locked_by': current_user.id,
            'locked_by_name': current_user.name
        }), 200

    except Exception as e:
        return jsonify({'error': f'리포트 잠금 중 오류가 발생했습니다: {str(e)}'}), 500

@service_report_bp.route('/<int:report_id>/unlock', methods=['POST'])
@admin_required
def unlock_service_report(report_id):
    """서비스 리포트 잠금 해제 (관리자만 가능)"""
    try:
        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        if not report.is_locked:
            return jsonify({'error': '잠금 처리되지 않은 리포트입니다.'}), 400

        # 잠금 해제
        conn = get_db_connection()
        conn.execute('''
            UPDATE service_reports
            SET is_locked = 0, locked_by = NULL, locked_at = NULL
            WHERE id = ?
        ''', (report_id,))
        conn.commit()
        conn.close()

        return jsonify({
            'message': '서비스 리포트 잠금이 해제되었습니다.',
            'is_locked': False
        }), 200

    except Exception as e:
        return jsonify({'error': f'리포트 잠금 해제 중 오류가 발생했습니다: {str(e)}'}), 500