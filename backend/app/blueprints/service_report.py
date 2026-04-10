from flask import Blueprint, request, jsonify, send_file
from app.utils.auth import permission_required, get_current_user, service_report_update_required, admin_required
from app.models.service_report import ServiceReport
from app.database.init_db import get_db_connection
import os
import base64
import io
from datetime import datetime

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

@service_report_bp.route('/<int:report_id>/signature', methods=['DELETE'])
@admin_required
def delete_signature(report_id):
    """고객 서명 삭제 (관리자만 가능)"""
    try:
        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        if not report.customer_signature:
            return jsonify({'error': '삭제할 서명이 없습니다.'}), 400

        conn = get_db_connection()
        try:
            conn.execute(
                'UPDATE service_reports SET customer_signature=NULL, customer_signed_at=NULL WHERE id=?',
                (report_id,)
            )
            conn.commit()
            return jsonify({'message': '서명이 삭제되었습니다.'}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': f'서명 삭제 중 오류가 발생했습니다: {str(e)}'}), 500


def _build_pdf_html(report_dict: dict) -> str:
    """서비스 리포트 데이터로 WeasyPrint용 HTML 생성"""
    r = report_dict

    # 로고 이미지 base64 로드
    logo_tag = ''
    logo_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', '..', 'instance', 'LVD Logo_default.jpg'
    ))
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_b64 = base64.b64encode(f.read()).decode('utf-8')
        logo_tag = f'<img src="data:image/jpeg;base64,{logo_b64}" style="height:40px; object-fit:contain;" />'
    else:
        logo_tag = '<div></div>'

    # 서비스 날짜 포맷
    service_date_str = '-'
    if r.get('service_date'):
        try:
            d = datetime.fromisoformat(r['service_date'].replace('Z', ''))
            service_date_str = f"{d.year}년 {d.month}월 {d.day}일"
        except Exception:
            service_date_str = r['service_date']

    # 출력일
    today_str = datetime.now().strftime('%Y년 %m월 %d일')

    # 동행/지원 기술자
    support_tech_names = r.get('support_technician_names') or '없음'

    # 사용부품
    parts = r.get('used_parts') or []
    parts_html = ''
    if parts:
        rows = ''.join(
            f'''<tr>
              <td style="border:1px solid #aaa; padding:3px 6px;">{p.get("part_name") or "-"}</td>
              <td style="border:1px solid #aaa; padding:3px 6px;">{p.get("part_number") or "-"}</td>
              <td style="border:1px solid #aaa; padding:3px 6px; text-align:center;">{p.get("quantity") or "-"}</td>
              <td style="border:1px solid #aaa; padding:3px 6px; text-align:right;">{f"{int(p.get('unit_price') or 0):,}" if isinstance(p.get("unit_price"), (int, float)) else "0"}</td>
              <td style="border:1px solid #aaa; padding:3px 6px; text-align:right; font-weight:bold;">{f"{int(p.get('total_price') or 0):,}" if isinstance(p.get("total_price"), (int, float)) else "0"}</td>
            </tr>'''
            for p in parts
        )
        parts_html = f'''
        <div style="font-weight:bold; font-size:10pt; margin-bottom:2mm;">사용부품 내역</div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:5mm; font-size:9pt;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="border:1px solid #aaa; padding:3px 6px; text-align:left;">부품명</th>
              <th style="border:1px solid #aaa; padding:3px 6px; text-align:left;">부품번호</th>
              <th style="border:1px solid #aaa; padding:3px 6px; text-align:center; width:60px;">수량</th>
              <th style="border:1px solid #aaa; padding:3px 6px; text-align:right; width:90px;">단가</th>
              <th style="border:1px solid #aaa; padding:3px 6px; text-align:right; width:90px;">총액</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>'''

    # 시간 기록부
    time_records = r.get('time_records') or []
    if not time_records and r.get('time_record'):
        time_records = [r['time_record']]
    time_html = ''
    if time_records:
        def fmt_date(d):
            if not d: return '-'
            try:
                dt = datetime.fromisoformat(str(d).replace('Z', ''))
                return f"{dt.year}년 {dt.month}월 {dt.day}일"
            except Exception:
                return str(d)

        def fmt_time(t):
            if not t: return '-'
            s = str(t).strip()
            # HH:MM:SS → HH:MM
            if len(s) >= 5 and ':' in s:
                return s[:5]
            return s

        rows = ''.join(
            f'''<tr>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center;">{fmt_date(tr.get("date") or tr.get("work_date"))}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center;">{fmt_time(tr.get("departure_time"))}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center;">{fmt_time(tr.get("work_start_time"))}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center;">{fmt_time(tr.get("work_end_time"))}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center;">{fmt_time(tr.get("travel_end_time"))}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center;">{fmt_time(tr.get("work_meal_time"))}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center;">{fmt_time(tr.get("travel_meal_time"))}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center; font-weight:bold; color:#1a56db;">{tr.get("calculated_work_time") or "-"}</td>
              <td style="border:1px solid #aaa; padding:2px 4px; text-align:center; font-weight:bold; color:#1a56db;">{tr.get("calculated_travel_time") or "-"}</td>
            </tr>'''
            for tr in time_records
        )
        time_html = f'''
        <div style="font-weight:bold; font-size:10pt; margin-bottom:2mm;">작업/이동 시간 기록부</div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:5mm; font-size:8.5pt;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center;">날짜</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center;">출발시간</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center;">작업시작</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center;">작업종료</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center;">이동종료</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center;">식사(작업)</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center;">식사(이동)</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center; color:#1a56db;">작업시간</th>
              <th style="border:1px solid #aaa; padding:2px 4px; text-align:center; color:#1a56db;">이동시간</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>'''

    # 고객 서명
    sig_html = ''
    if r.get('has_signature') and r.get('customer_signature'):
        signed_at = '-'
        if r.get('customer_signed_at'):
            try:
                dt = datetime.fromisoformat(str(r['customer_signed_at']).replace('Z', ''))
                signed_at = dt.strftime('%Y년 %m월 %d일 %H:%M')
            except Exception:
                signed_at = str(r['customer_signed_at'])
        sig_html = f'''
        <div style="margin-top:6mm;">
          <div style="font-weight:bold; font-size:10pt; margin-bottom:2mm;">고객 서명</div>
          <table style="width:100%; border-collapse:collapse; font-size:9pt;">
            <tr>
              <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; width:20%; vertical-align:middle;">서명자</td>
              <td style="border:1px solid #aaa; padding:3px 6px; vertical-align:middle;">{r.get("signer_name") or "-"}</td>
              <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; width:20%; vertical-align:middle;">서명일시</td>
              <td style="border:1px solid #aaa; padding:3px 6px; vertical-align:middle;">{signed_at}</td>
            </tr>
            <tr>
              <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; vertical-align:top;">서명</td>
              <td colspan="3" style="border:1px solid #aaa; padding:4px 6px;">
                <img src="{r["customer_signature"]}" style="max-height:60px; max-width:300px;" />
              </td>
            </tr>
          </table>
        </div>'''

    problem_desc = (r.get('problem_description') or r.get('symptom') or '-').replace('\n', '<br>')
    solution_desc = (r.get('solution_description') or r.get('details') or '-').replace('\n', '<br>')

    html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @font-face {{
    font-family: 'NanumGothic';
    src: local('NanumGothic'), local('나눔고딕'),
         url('/usr/share/fonts/truetype/nanum/NanumGothic.ttf') format('truetype');
  }}
  body {{
    font-family: 'NanumGothic', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    font-size: 10pt;
    color: #000;
    margin: 0;
    padding: 0;
  }}
  @page {{
    size: A4;
    margin: 10mm 15mm;
  }}
</style>
</head>
<body>
  <div>
    <!-- 헤더 -->
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8mm;">
      {logo_tag}
      <div style="text-align:center; flex:1;">
        <h2 style="margin:0; font-size:16pt; letter-spacing:4px;">서비스 리포트</h2>
        <div style="font-size:9pt; color:#555; margin-top:2mm;">No. {r.get("report_number") or r.get("id")}</div>
      </div>
      <div style="width:40px;"></div>
    </div>

    <!-- 기본 정보 -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:5mm; font-size:9pt;">
      <tr>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; width:18%">서비스 날짜</td>
        <td style="border:1px solid #aaa; padding:3px 6px; width:22%">{service_date_str}</td>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; width:15%">서비스담당</td>
        <td style="border:1px solid #aaa; padding:3px 6px; width:18%">{r.get("technician_name") or "-"}</td>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; width:12%">동행/지원</td>
        <td style="border:1px solid #aaa; padding:3px 6px;">{support_tech_names}</td>
      </tr>
      <tr>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px;">고객명</td>
        <td style="border:1px solid #aaa; padding:3px 6px;" colspan="5">{r.get("customer_name") or "-"}</td>
      </tr>
      <tr>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px;">고객사 주소</td>
        <td style="border:1px solid #aaa; padding:3px 6px;" colspan="5">{r.get("customer_address") or "-"}</td>
      </tr>
      <tr>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px;">Model</td>
        <td style="border:1px solid #aaa; padding:3px 6px;">{r.get("machine_model") or "-"}</td>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px;">SN</td>
        <td style="border:1px solid #aaa; padding:3px 6px;" colspan="3">{r.get("machine_serial") or "-"}</td>
      </tr>
    </table>

    <!-- 작업 내용 -->
    <div style="font-weight:bold; font-size:10pt; margin-bottom:2mm;">작업 내용</div>
    <table style="width:100%; border-collapse:collapse; margin-bottom:5mm; font-size:9pt;">
      <tr>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; width:20%; vertical-align:top;">Job Description</td>
        <td style="border:1px solid #aaa; padding:4px 6px; min-height:20mm;">{problem_desc}</td>
      </tr>
      <tr>
        <td style="background:#f0f0f0; font-weight:bold; border:1px solid #aaa; padding:3px 6px; vertical-align:top;">처리 내용</td>
        <td style="border:1px solid #aaa; padding:4px 6px; min-height:25mm;">{solution_desc}</td>
      </tr>
    </table>

    {parts_html}
    {time_html}
    {sig_html}

    <div style="margin-top:8mm; border-top:1px solid #ccc; padding-top:4mm; font-size:8pt; color:#777; text-align:right;">
      출력일: {today_str}
    </div>
  </div>
</body>
</html>'''
    return html


@service_report_bp.route('/<int:report_id>/pdf', methods=['GET'])
@permission_required('service_report')
def generate_pdf(report_id):
    """서비스 리포트 PDF 생성 (WeasyPrint 사용)"""
    try:
        from weasyprint import HTML as WeasyHTML

        report = ServiceReport.get_by_id(report_id)
        if not report:
            return jsonify({'error': '서비스 리포트를 찾을 수 없습니다.'}), 404

        report_dict = report.to_dict()

        # support_technician_names가 없으면 DB에서 조회
        if not report_dict.get('support_technician_names'):
            support_ids = report_dict.get('support_technician_ids') or []
            if support_ids:
                conn = get_db_connection()
                names = []
                for uid in support_ids:
                    row = conn.execute('SELECT name FROM users WHERE id=?', (uid,)).fetchone()
                    if row:
                        names.append(row['name'])
                conn.close()
                report_dict['support_technician_names'] = ', '.join(names) if names else '없음'
            else:
                report_dict['support_technician_names'] = '없음'

        html_content = _build_pdf_html(report_dict)
        pdf_bytes = WeasyHTML(string=html_content).write_pdf()

        # 파일명 생성
        customer_name = report_dict.get('customer_name') or '고객'
        report_number = report_dict.get('report_number') or str(report_id)
        filename = f"{customer_name}-{report_number}.pdf"
        # 파일명에서 위험 문자 제거
        filename = ''.join(c for c in filename if c not in r'\/:*?"<>|')

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )

    except ImportError:
        return jsonify({'error': 'WeasyPrint가 설치되어 있지 않습니다.'}), 500
    except Exception as e:
        return jsonify({'error': f'PDF 생성 중 오류가 발생했습니다: {str(e)}'}), 500
