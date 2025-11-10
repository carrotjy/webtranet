from flask import Blueprint, request, jsonify
from app.utils.auth import permission_required
from app.models.customer import Customer
from app.models.resource import Resource
import pandas as pd
import os
import re
import base64
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image

# OCR 라이브러리 - Tesseract 또는 easyocr 사용
OCR_METHOD = 'easyocr'  # 'tesseract' 또는 'easyocr'

if OCR_METHOD == 'tesseract':
    import pytesseract
elif OCR_METHOD == 'easyocr':
    try:
        import easyocr
        # EasyOCR reader 초기화 (한글, 영어)
        reader = easyocr.Reader(['ko', 'en'], gpu=False)
    except ImportError:
        OCR_METHOD = 'manual'
        reader = None

customer_bp = Blueprint('customer', __name__)

# 명함 이미지 저장 디렉토리
BUSINESS_CARD_UPLOAD_FOLDER = os.path.join('static', 'business_cards')
os.makedirs(BUSINESS_CARD_UPLOAD_FOLDER, exist_ok=True)

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
            homepage=data.get('homepage', ''),
            business_card_image=data.get('business_card_image', ''),
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
        customer.homepage = data.get('homepage', customer.homepage)
        customer.business_card_image = data.get('business_card_image', customer.business_card_image)
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

@customer_bp.route('/extract-business-card', methods=['POST'])
# @permission_required('customer')  # 임시로 주석 처리
def extract_business_card():
    """명함 이미지로부터 고객 정보 추출"""
    try:
        # 파일 업로드 확인
        if 'image' not in request.files:
            return jsonify({'error': '이미지 파일이 선택되지 않았습니다.'}), 400

        file = request.files['image']

        if file.filename == '':
            return jsonify({'error': '이미지 파일이 선택되지 않았습니다.'}), 400

        # 이미지 파일 확인
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp'}
        file_ext = os.path.splitext(file.filename)[1].lower()

        if file_ext not in allowed_extensions:
            return jsonify({'error': '이미지 파일만 업로드 가능합니다.'}), 400

        # 파일 저장
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(BUSINESS_CARD_UPLOAD_FOLDER, unique_filename)
        file.save(filepath)

        try:
            # OCR 수행
            if OCR_METHOD == 'tesseract':
                image = Image.open(filepath)
                custom_config = r'--oem 3 --psm 6'
                text = pytesseract.image_to_string(image, lang='kor+eng', config=custom_config)
            elif OCR_METHOD == 'easyocr':
                # EasyOCR 사용
                result = reader.readtext(filepath)
                # 결과를 텍스트로 변환
                text = '\n'.join([detection[1] for detection in result])
            else:
                # OCR 라이브러리가 없는 경우
                return jsonify({
                    'error': 'OCR 라이브러리가 설치되지 않았습니다. easyocr 또는 tesseract를 설치해주세요.'
                }), 500

            # 텍스트에서 정보 추출
            extracted_data = parse_business_card_text(text)

            # 이미지 경로 추가
            extracted_data['business_card_image'] = filepath.replace('\\', '/')

            return jsonify({
                'success': True,
                'data': extracted_data,
                'raw_text': text  # 디버깅용
            }), 200

        except Exception as e:
            # OCR 실패 시 파일 삭제
            if os.path.exists(filepath):
                os.remove(filepath)
            raise e

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'명함 정보 추출 중 오류가 발생했습니다: {str(e)}'}), 500


def parse_business_card_text(text):
    """명함 텍스트에서 구조화된 정보 추출 (향상된 버전)"""
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    data = {
        'company_name': '',
        'contact_person': '',
        'email': '',
        'phone': '',
        'address': '',
        'fax': '',
        'mobile': '',
        'homepage': '',
        'president': ''
    }

    # 전체 텍스트를 하나의 문자열로 (멀티라인 패턴 매칭용)
    full_text = ' '.join(lines)

    # 1. 이메일 추출 (가장 명확한 패턴)
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    email_matches = re.findall(email_pattern, full_text)
    if email_matches:
        data['email'] = email_matches[0]

    # 2. 전화번호 추출 (컨텍스트 기반 우선순위)
    phone_numbers = []
    for i, line in enumerate(lines):
        # 모든 전화번호 형식 추출 (02-1234-5678, 031-123-4567, 010-1234-5678 등)
        numbers = re.findall(r'(\d{2,4})[-.\s]?(\d{3,4})[-.\s]?(\d{4})', line)
        for num in numbers:
            formatted_num = f"{num[0]}-{num[1]}-{num[2]}"
            phone_numbers.append({
                'number': formatted_num,
                'line': line,
                'index': i,
                'type': None
            })

    # 전화번호 타입 분류 (키워드 기반)
    for entry in phone_numbers:
        line_upper = entry['line'].upper()
        number = entry['number']

        # 팩스 (FAX, F, 팩스 키워드 또는 F. F: 등)
        if any(keyword in line_upper for keyword in ['FAX', '팩스', 'F.', 'F:']):
            if not data['fax']:
                data['fax'] = number
                entry['type'] = 'fax'
        # 휴대폰 (010, 011, 016, 017, 018, 019로 시작)
        elif number.startswith(('010', '011', '016', '017', '018', '019')):
            if not data['mobile']:
                data['mobile'] = number
                entry['type'] = 'mobile'
        # HP, H.P, Mobile, 휴대폰 키워드
        elif any(keyword in line_upper for keyword in ['HP', 'H.P', 'MOBILE', '휴대폰', '핸드폰']):
            if not data['mobile']:
                data['mobile'] = number
                entry['type'] = 'mobile'
        # TEL, T, 전화 키워드
        elif any(keyword in line_upper for keyword in ['TEL', '전화', 'T.', 'T:', 'PHONE']):
            if not data['phone']:
                data['phone'] = number
                entry['type'] = 'phone'

    # 분류되지 않은 전화번호 처리 (우선순위: 일반전화 > 휴대폰)
    for entry in phone_numbers:
        if entry['type'] is None:
            number = entry['number']
            # 지역번호로 시작하면 일반 전화
            if number.startswith(('02-', '031-', '032-', '033-', '041-', '042-', '043-', '044-',
                                  '051-', '052-', '053-', '054-', '055-', '061-', '062-', '063-', '064-')):
                if not data['phone']:
                    data['phone'] = number
            # 010 등으로 시작하면 휴대폰
            elif number.startswith(('010-', '011-', '016-', '017-', '018-', '019-')):
                if not data['mobile']:
                    data['mobile'] = number

    # 3. 홈페이지 추출 (개선된 패턴)
    # URL 패턴 (http://, https://, www. 포함)
    homepage_patterns = [
        r'(?:https?://)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?:/[^\s]*)?',
        r'(?:www\.)([a-zA-Z0-9][-a-zA-Z0-9]*\.)+(?:com|co\.kr|net|org|kr)',
    ]

    for line in lines:
        line_lower = line.lower()
        # URL 키워드가 포함된 라인 우선 검색
        if any(keyword in line_lower for keyword in ['www.', 'http', '.com', '.co.kr', '.net', '.org']):
            for pattern in homepage_patterns:
                homepage_match = re.search(pattern, line)
                if homepage_match:
                    homepage = homepage_match.group()
                    # 이메일과 혼동 방지
                    if '@' not in homepage:
                        if not homepage.startswith('http'):
                            homepage = 'http://' + homepage
                        data['homepage'] = homepage
                        break
        if data['homepage']:
            break

    # 4. 회사명 추출 (개선된 로직)
    company_keywords = ['주식회사', '(주)', '㈜', 'Co.,', 'Ltd.', 'Inc.', 'Corp.',
                        'Company', '유한회사', '(유)', 'Corporation']

    # 키워드가 있는 라인을 회사명으로 우선 추출
    for i, line in enumerate(lines):
        if any(keyword in line for keyword in company_keywords):
            # 이메일, 전화번호, 주소가 아닌 경우
            if not re.search(email_pattern, line) and not re.search(r'\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}', line):
                # 너무 길지 않은 경우 (주소 제외)
                if len(line) < 50:
                    data['company_name'] = line.strip()
                    break

    # 회사명이 없으면 첫 1-3줄 중에서 찾기
    if not data['company_name']:
        for line in lines[:3]:
            # 이메일, 전화번호, URL이 없고, 적절한 길이인 경우
            if (not re.search(email_pattern, line) and
                not re.search(r'\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}', line) and
                not re.search(r'www\.|http|\.com', line.lower()) and
                5 < len(line) < 50):
                data['company_name'] = line.strip()
                break

    # 5. 이름 추출 (개선된 로직 - 위치 기반)
    position_keywords = ['대표', '이사', '부장', '과장', '차장', '팀장', '사원', '실장', '본부장',
                        'CEO', 'CTO', 'CFO', 'COO', 'President', 'Manager', 'Director',
                        'Executive', 'Chief', '대표이사']

    # 회사명 다음 라인이나 직책 키워드 근처에서 이름 찾기
    company_index = -1
    for i, line in enumerate(lines):
        if line == data['company_name']:
            company_index = i
            break

    # 회사명 이후 2-5번째 줄 내에서 이름 찾기
    search_start = max(0, company_index + 1) if company_index >= 0 else 1
    search_end = min(len(lines), search_start + 5)

    for i in range(search_start, search_end):
        line = lines[i]
        # 이메일, 전화번호, URL이 아니고
        if (not re.search(email_pattern, line) and
            not re.search(r'\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}', line) and
            not re.search(r'www\.|http', line.lower())):

            # 직책 키워드만 있는 경우 다음 줄 확인
            if any(keyword in line for keyword in position_keywords):
                # 같은 줄에 이름이 있을 수 있음
                for keyword in position_keywords:
                    line_clean = line.replace(keyword, '').strip()
                    if re.match(r'^[가-힣]{2,4}$', line_clean):
                        data['contact_person'] = line_clean
                        break
                if data['contact_person']:
                    break
            # 한글 이름 (2-4글자, 단독)
            elif re.match(r'^[가-힣]{2,4}$', line.strip()):
                data['contact_person'] = line.strip()
                break
            # 영문 이름
            elif re.match(r'^[A-Z][a-z]+\s[A-Z][a-z]+$', line.strip()):
                data['contact_person'] = line.strip()
                break

    # 6. 주소 추출 (개선된 로직)
    address_keywords = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '제주',
                        '특별시', '광역시', '도', '시', '군', '구', '읍', '면', '동', '로', '길', '가',
                        'Road', 'St.', 'Street', 'Ave', 'Avenue']

    address_candidates = []
    for i, line in enumerate(lines):
        # 주소 키워드가 포함되고 충분히 긴 경우
        if any(keyword in line for keyword in address_keywords) and len(line) > 10:
            # 전화번호나 이메일만 있는 라인 제외
            if not re.match(r'^[\d\s\-\.\(\)]+$', line) and '@' not in line:
                address_candidates.append({'text': line, 'score': 0, 'index': i})

    # 주소 스코어링 (더 많은 키워드 = 더 높은 점수)
    for candidate in address_candidates:
        for keyword in address_keywords:
            if keyword in candidate['text']:
                candidate['score'] += 1
        # 숫자 포함 (건물 번호 등)
        if re.search(r'\d+', candidate['text']):
            candidate['score'] += 1
        # 길이 점수
        if len(candidate['text']) > 20:
            candidate['score'] += 2

    # 가장 높은 점수의 주소 선택
    if address_candidates:
        address_candidates.sort(key=lambda x: x['score'], reverse=True)
        data['address'] = address_candidates[0]['text'].strip()

    # 7. 대표 이름 추출 (대표이사, CEO 등)
    for line in lines:
        if any(keyword in line for keyword in ['대표이사', '대표', 'CEO', 'President']):
            # 한글 이름 추출
            name_match = re.search(r'[가-힣]{2,4}', line)
            if name_match:
                name = name_match.group()
                # 직책 키워드가 아닌 경우
                if name not in ['대표', '이사', '대표이사']:
                    data['president'] = name
                    break

    return data


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