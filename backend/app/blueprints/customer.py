from flask import Blueprint, request, jsonify
from app.utils.auth import permission_required
from app.models.customer import Customer
from app.models.resource import Resource
import pandas as pd
import os
from werkzeug.utils import secure_filename

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/', methods=['GET'])
# @permission_required('customer')  # 임시로 주석 처리
def get_customers():
    """고객정보 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', None, type=int)  # None으로 변경하여 제한 없음을 기본값으로
        keyword = request.args.get('keyword')
        include_resources = request.args.get('include_resources', 'false').lower() == 'true'
        
        if keyword:
            customers, total = Customer.search(keyword=keyword, page=page, per_page=per_page)
        else:
            customers, total = Customer.get_all(page=page, per_page=per_page)
        
        # 리소스 정보 포함 요청시 추가
        customer_list = []
        for customer in customers:
            try:
                customer_dict = customer.to_dict()
                if include_resources:
                    resources = Resource.get_by_customer_id(customer.id)
                    customer_dict['resources'] = [resource.to_dict() for resource in resources]
                customer_list.append(customer_dict)
            except Exception as e:
                raise e
        
        return jsonify({
            'customers': customer_list,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': 1 if per_page is None else (total + per_page - 1) // per_page
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'고객정보 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@customer_bp.route('/search', methods=['GET'])
def search_customers():
    """고객사명 검색 - 부품 출고 시 사용처 검색용"""
    try:
        query = request.args.get('q', '').strip()

        # 검색어가 없으면 전체 고객 목록 반환 (최대 10개)
        if not query:
            customers, total = Customer.get_all(page=1, per_page=10)
        else:
            # 검색어가 있으면 검색 - 최대 10개 결과만 반환
            customers, total = Customer.search(keyword=query, page=1, per_page=10)
        
        # 간단한 형태로 반환 (id, company_name, customer_name 모두 포함)
        customer_list = [
            {
                'id': customer.id,
                'company_name': customer.company_name,  # 표시용
                'customer_name': customer.company_name,  # 입력 필드 설정용 (하위 호환성)
                'address': customer.address if hasattr(customer, 'address') else None
            }
            for customer in customers
        ]
        
        return jsonify({
            'success': True,
            'data': customer_list
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'고객 검색 중 오류가 발생했습니다: {str(e)}'
        }), 500

@customer_bp.route('/<int:customer_id>', methods=['GET'])
# @permission_required('customer')  # 임시로 주석 처리
def get_customer(customer_id):
    """특정 고객정보 조회"""
    try:
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': '고객정보를 찾을 수 없습니다.'}), 404
        
        # 고객 정보에 리소스 포함
        customer_dict = customer.to_dict()
        resources = Resource.get_by_customer_id(customer.id)
        customer_dict['resources'] = [resource.to_dict() for resource in resources]
        
        return jsonify(customer_dict), 200
    except Exception as e:
        return jsonify({'error': f'고객정보 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@customer_bp.route('/', methods=['POST'])
# @permission_required('customer')  # 임시로 주석 처리
def create_customer():
    """새 고객정보 생성"""
    try:
        data = request.get_json()

        # 필수 필드 확인
        if not data.get('company_name'):
            return jsonify({'error': '회사명은 필수 항목입니다.'}), 400

        customer = Customer(
            company_name=data['company_name'],
            contact_person=data.get('contact_person', ''),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            address=data.get('address', ''),
            postal_code=data.get('postal_code', ''),
            tel=data.get('tel', ''),
            fax=data.get('fax', ''),
            president=data.get('president', ''),
            mobile=data.get('mobile', ''),
            contact=data.get('contact', ''),
            notes=data.get('notes', '')
        )

        customer_id = customer.save()
        if customer_id:
            return jsonify({
                'message': '고객정보가 성공적으로 생성되었습니다.',
                'customer': customer.to_dict()
            }), 201
        else:
            return jsonify({'error': '고객정보 생성에 실패했습니다.'}), 500

    except Exception as e:
        return jsonify({'error': f'고객정보 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@customer_bp.route('/<int:customer_id>', methods=['PUT'])
# @permission_required('customer')  # 임시로 주석 처리
def update_customer(customer_id):
    """고객정보 수정"""
    try:
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': '고객정보를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 필드 업데이트
        customer.company_name = data.get('company_name', customer.company_name)
        customer.contact_person = data.get('contact_person', customer.contact_person)
        customer.email = data.get('email', customer.email)
        customer.phone = data.get('phone', customer.phone)
        customer.address = data.get('address', customer.address)
        customer.postal_code = data.get('postal_code', customer.postal_code)
        customer.tel = data.get('tel', customer.tel)
        customer.fax = data.get('fax', customer.fax)
        customer.president = data.get('president', customer.president)
        customer.mobile = data.get('mobile', customer.mobile)
        customer.contact = data.get('contact', customer.contact)
        customer.notes = data.get('notes', customer.notes)
        
        if customer.save():
            return jsonify({
                'message': '고객정보가 성공적으로 수정되었습니다.',
                'customer': customer.to_dict()
            }), 200
        else:
            return jsonify({'error': '고객정보 수정에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'고객정보 수정 중 오류가 발생했습니다: {str(e)}'}), 500

@customer_bp.route('/<int:customer_id>', methods=['DELETE'])
# @permission_required('customer')  # 임시로 주석 처리
def delete_customer(customer_id):
    """고객정보 삭제"""
    try:
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': '고객정보를 찾을 수 없습니다.'}), 404
        
        if customer.delete():
            return jsonify({'message': '고객정보가 성공적으로 삭제되었습니다.'}), 200
        else:
            return jsonify({'error': '고객정보 삭제에 실패했습니다.'}), 500
            
    except Exception as e:
        return jsonify({'error': f'고객정보 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

@customer_bp.route('/import-excel', methods=['POST'])
# @permission_required('customer')  # 임시로 주석 처리
def import_customers_from_excel():
    """엑셀 파일로부터 고객정보 일괄 등록"""
    try:
        # 파일 업로드 확인
        if 'file' not in request.files:
            return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
        
        # 파일 확장자 확인
        if not (file.filename.lower().endswith('.xlsx') or file.filename.lower().endswith('.xls')):
            return jsonify({'error': '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.'}), 400
        
        # 임시 파일 저장
        filename = secure_filename(file.filename)
        temp_path = os.path.join('temp', filename)
        
        # temp 디렉토리 생성
        os.makedirs('temp', exist_ok=True)
        file.save(temp_path)
        
        try:
            # 엑셀 파일 읽기
            df = pd.read_excel(temp_path)
            
            # 필요한 컬럼 확인
            required_columns = ['company_name']  # company_name만 필수로 변경
            optional_columns = ['contact_person', 'email', 'phone', 'address', 'postal_code', 'tel', 'fax', 'president', 'mobile', 'contact']
            
            # 필수 컬럼 확인
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'필수 컬럼이 누락되었습니다: {", ".join(missing_columns)}'}), 400
            
            success_count = 0
            error_count = 0
            errors = []
            
            # 각 행 처리
            for index, row in df.iterrows():
                try:
                    # 안전한 값 추출 함수
                    def safe_get_value(value, is_required=False):
                        """안전하게 값을 추출하고 빈 값 처리"""
                        if pd.isna(value) or value is None:
                            return "NONE" if is_required else "담당자 미지정"  # contact_person의 기본값
                        return str(value).strip() if str(value).strip() else ("NONE" if is_required else "담당자 미지정")
                    
                    # 필수 데이터 확인 (회사명만 필수)
                    company_name = safe_get_value(row['company_name'], True)
                    
                    # 회사명이 진짜 비어있는 경우에만 에러
                    if pd.isna(row['company_name']) or str(row['company_name']).strip() == '':
                        error_count += 1
                        errors.append(f'행 {index + 2}: 회사명은 필수 항목입니다.')
                        continue
                    
                    # 고객 데이터 준비
                    customer_data = {
                        'company_name': company_name
                    }
                    
                    # 모든 컬럼을 선택적으로 처리 (contact_person 포함)
                    for col in optional_columns:
                        if col in df.columns:
                            if col == 'contact_person':
                                # contact_person은 특별히 기본값 설정
                                customer_data[col] = safe_get_value(row[col])
                            else:
                                customer_data[col] = safe_get_value(row[col])
                        else:
                            customer_data[col] = "NONE"
                    
                    # 기존 고객 확인 (회사명으로)
                    existing_customer = Customer.get_by_company_name(customer_data['company_name'])
                    
                    if existing_customer:
                        # 기존 고객 정보 업데이트
                        for key, value in customer_data.items():
                            if key != 'company_name':  # 회사명은 변경하지 않음
                                setattr(existing_customer, key, value)
                        
                        result = existing_customer.update()
                        if result:
                            success_count += 1
                        else:
                            error_count += 1
                            errors.append(f'행 {index + 2}: 고객 정보 업데이트 실패')
                    else:
                        # 새 고객 생성
                        new_customer = Customer(**customer_data)
                        result = new_customer.save()
                        if result:
                            success_count += 1
                        else:
                            error_count += 1
                            errors.append(f'행 {index + 2}: 고객 정보 저장 실패')
                            
                except Exception as e:
                    error_count += 1
                    error_msg = f'행 {index + 2}: {str(e)}'
                    errors.append(error_msg)
                    import traceback
                    traceback.print_exc()
            
            return jsonify({
                'message': f'엑셀 임포트 완료',
                'success_count': success_count,
                'error_count': error_count,
                'errors': errors[:10]  # 최대 10개 에러만 반환
            }), 200
            
        except Exception as e:
            return jsonify({'error': f'엑셀 파일 처리 중 오류가 발생했습니다: {str(e)}'}), 500
        
        finally:
            # 임시 파일 삭제
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        return jsonify({'error': f'파일 업로드 중 오류가 발생했습니다: {str(e)}'}), 500