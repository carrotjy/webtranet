"""
JSharp Blueprint
J# 이미지 처리 및 주문 관리 API 엔드포인트
"""
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from PIL import Image, ImageDraw, ImageFont
import os
import io
import zipfile
import tempfile
import pandas as pd
import re
from datetime import datetime
import msoffcrypto
from app.database.jsharp_db import insert_order, get_all_orders, delete_order, clear_all_orders, update_order_status

# HEIC 지원을 위한 pillow-heif 등록
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_SUPPORTED = True
except ImportError:
    HEIC_SUPPORTED = False
    print("Warning: pillow-heif not installed. HEIC/HEIF files will not be supported.")

jsharp_bp = Blueprint('jsharp', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'heic', 'heif'}
ALLOWED_EXCEL_EXTENSIONS = {'xlsx', 'xls'}
IMAGE_SIZES = [430, 640, 860, 1000]


def apply_field_replacements(field_value, replacements):
    """
    필드에 치환 규칙 적용 (product_name, option, additional_items 등)
    
    Args:
        field_value: 원본 필드 값
        replacements: 치환 규칙 리스트 [{"before": "...", "after": "..."}, ...]
        
    Returns:
        치환된 필드 값
    """
    if not field_value or not replacements:
        return field_value
    
    result = field_value
    for replacement in replacements:
        before = replacement.get('before', '')
        after = replacement.get('after', '')
        if before and after:
            result = result.replace(before, after)
    
    return result


def decrypt_excel_file(file_stream, password):
    """
    암호화된 엑셀 파일을 해제

    Args:
        file_stream: 암호화된 엑셀 파일 스트림
        password: 비밀번호

    Returns:
        BytesIO: 해제된 파일 스트림 또는 None
    """
    try:
        if not password:
            return file_stream

        print(f"[DEBUG] Attempting to decrypt Excel file with password")
        file_stream.seek(0)

        # msoffcrypto로 암호 해제
        decrypted = io.BytesIO()
        office_file = msoffcrypto.OfficeFile(file_stream)
        office_file.load_key(password=password)
        office_file.decrypt(decrypted)

        decrypted.seek(0)
        print(f"[DEBUG] Excel file decrypted successfully")
        return decrypted
    except Exception as e:
        print(f"[ERROR] Failed to decrypt Excel file: {e}")
        # 암호 해제 실패 시 원본 스트림 반환 (암호가 없는 파일일 수 있음)
        file_stream.seek(0)
        return file_stream


def safe_int(value, default=0):
    """
    안전하게 정수로 변환 (쉼표 제거)
    """
    try:
        if pd.isna(value) or value == '' or value == 'nan':
            return default
        # 쉼표 제거 후 변환
        cleaned = str(value).replace(',', '').strip()
        return int(float(cleaned)) if cleaned else default
    except (ValueError, AttributeError):
        return default


def safe_float(value, default=0.0):
    """
    안전하게 실수로 변환 (쉼표 제거)
    """
    try:
        if pd.isna(value) or value == '' or value == 'nan':
            return default
        # 쉼표 제거 후 변환
        cleaned = str(value).replace(',', '').strip()
        return float(cleaned) if cleaned else default
    except (ValueError, AttributeError):
        return default


def parse_column_reference(column_ref):
    """
    "A/수취인" 형식을 파싱하여 (컬럼 인덱스, 텍스트) 반환
    
    Args:
        column_ref: "A/수취인" 형식의 문자열 또는 컬럼 문자만 (예: "A")
        
    Returns:
        tuple: (컬럼_인덱스, 검색_텍스트) 또는 (None, None)
    """
    if not column_ref:
        return None, None
    
    column_ref = column_ref.strip()
    
    # "A/수취인" 형식 파싱
    if '/' in column_ref:
        parts = column_ref.split('/', 1)
        column_letter = parts[0].strip().upper()
        search_text = parts[1].strip()
        
        if not search_text:  # 슬래시는 있지만 텍스트가 없는 경우 (예: "A/")
            return None, None
        
        # 엑셀 컬럼 문자를 숫자 인덱스로 변환 (A=0, B=1, ...)
        column_index = 0
        for char in column_letter:
            if not char.isalpha():
                return None, None
            column_index = column_index * 26 + (ord(char) - ord('A') + 1)
        column_index -= 1  # 0-based index
        
        return column_index, search_text
    
    # 슬래시 없으면 컬럼 문자만 입력된 경우 (예: "A", "B")
    # 이 경우 헤더 행에서 아무 텍스트나 찾기 (빈 문자열이 아닌)
    column_letter = column_ref.upper()
    if column_letter.isalpha():
        column_index = 0
        for char in column_letter:
            column_index = column_index * 26 + (ord(char) - ord('A') + 1)
        column_index -= 1
        return column_index, None  # 텍스트 없이 컬럼만 지정
    
    # 그 외의 경우 (기존 방식: 컬럼명 전체 문자열)
    return None, column_ref


def find_header_row_and_detect_site(file_stream, column_mappings):
    """
    엑셀 파일에서 헤더행 위치를 찾고 사이트를 자동 감지

    Args:
        file_stream: 파일 스트림
        column_mappings: 각 사이트별 컬럼 매핑 정보 (프론트엔드에서 전달)

    Returns:
        tuple: (감지된_사이트명, 헤더_행_번호, DataFrame) 또는 (None, None, None)
    """
    try:
        print(f"[DEBUG] find_header_row_and_detect_site: Reading excel file preview...")
        # 전체 엑셀 읽기 (처음 10행만 - 헤더는 보통 상단에 있음)
        df_preview = pd.read_excel(file_stream, header=None, nrows=10)
        print(f"[DEBUG] Preview shape: {df_preview.shape} (rows x cols)")
        
        # 각 사이트에 대해 검증
        for site in ['ebay', 'smartstore', '11st', 'coupang', 'logen']:
            if site not in column_mappings:
                continue

            print(f"[DEBUG] Checking site: {site}")
            site_mapping = column_mappings[site]
            
            # 필수 3개 필드 확인
            required_fields = ['recipient_name', 'phone', 'address']
            matches = {}  # {field_name: header_row_index}
            
            for field in required_fields:
                column_ref = site_mapping.get(field)
                if not column_ref:
                    break
                    
                col_index, search_text = parse_column_reference(column_ref)
                
                if col_index is None:
                    break
                
                # 해당 컬럼에서 텍스트 검색 (처음 10행 내에서)
                found = False
                for row_idx in range(len(df_preview)):
                    try:
                        if col_index < len(df_preview.columns):
                            cell_value = str(df_preview.iloc[row_idx, col_index])
                            
                            # search_text가 None이면 (컬럼만 지정) 빈 값이 아닌 셀을 헤더로 간주
                            if search_text is None:
                                if cell_value and cell_value != 'nan' and len(cell_value.strip()) > 0:
                                    matches[field] = row_idx
                                    found = True
                                    print(f"[DEBUG] {site} - {field}: Found at row {row_idx}, col {col_index}, value='{cell_value}'")
                                    break
                            # search_text가 있으면 해당 텍스트를 찾음
                            elif search_text in cell_value:
                                matches[field] = row_idx
                                found = True
                                print(f"[DEBUG] {site} - {field}: Found '{search_text}' in row {row_idx}, col {col_index}, value='{cell_value}'")
                                break
                    except Exception as e:
                        continue
                
                if not found:
                    print(f"[DEBUG] {site} - {field}: NOT FOUND (col_index={col_index}, search_text='{search_text}')")
                    # 디버깅: 해당 컬럼의 모든 값 출력
                    if col_index < len(df_preview.columns):
                        print(f"[DEBUG] Column {col_index} values:")
                        for r in range(min(5, len(df_preview))):
                            print(f"  Row {r}: '{df_preview.iloc[r, col_index]}'")
                    break
            
            # 3개 필수 필드가 모두 매칭되었는지 확인
            if len(matches) == 3:
                # 모든 필드가 같은 행에 있는지 확인
                header_rows = set(matches.values())
                if len(header_rows) == 1:
                    header_row = list(header_rows)[0]
                    # 헤더 행을 기준으로 다시 엑셀 읽기
                    file_stream.seek(0)
                    df_full = pd.read_excel(file_stream, header=header_row)
                    return site, header_row, df_full
        
        print(f"[DEBUG] Could not detect any site from excel file")
        return None, None, None

    except Exception as e:
        print(f"[ERROR] Exception in find_header_row_and_detect_site: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None


def allowed_file(filename):
    """허용된 파일 확장자 확인"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def add_white_border(image, border_width=1):
    """
    이미지 최외각에 흰색 테두리 추가

    Args:
        image: PIL Image 객체
        border_width: 테두리 두께 (픽셀)

    Returns:
        테두리가 추가된 PIL Image 객체
    """
    # 새 이미지 크기 (테두리 포함)
    new_width = image.width + (border_width * 2)
    new_height = image.height + (border_width * 2)

    # 흰색 배경의 새 이미지 생성
    new_image = Image.new('RGB', (new_width, new_height), 'white')

    # 원본 이미지를 중앙에 붙여넣기
    new_image.paste(image, (border_width, border_width))

    return new_image


def resize_image_with_border(image, target_width):
    """
    이미지를 지정된 너비로 리사이즈하고 흰색 테두리 추가

    Args:
        image: PIL Image 객체
        target_width: 목표 너비 (픽셀)

    Returns:
        리사이즈되고 테두리가 추가된 PIL Image 객체
    """
    # 원본 비율 유지하면서 리사이즈
    aspect_ratio = image.height / image.width
    target_height = int(target_width * aspect_ratio)

    # 리사이즈
    resized_image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # RGB 모드로 변환 (PNG 등의 경우)
    if resized_image.mode != 'RGB':
        resized_image = resized_image.convert('RGB')

    # 1px 흰색 테두리 추가
    final_image = add_white_border(resized_image, border_width=1)

    return final_image


@jsharp_bp.route('/jsharp/process-images', methods=['POST'])
@jwt_required()
def process_images():
    """
    이미지 처리: 4개 사이즈로 변환하고 1px 흰색 테두리 추가
    처리된 이미지를 ZIP 파일로 반환
    """
    try:
        # 업로드된 파일 확인
        if 'images' not in request.files:
            return jsonify({
                'success': False,
                'message': '이미지 파일이 없습니다.'
            }), 400

        files = request.files.getlist('images')

        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'message': '이미지 파일이 없습니다.'
            }), 400

        # 임시 디렉토리 생성
        temp_dir = tempfile.mkdtemp()

        try:
            # 각 이미지 처리
            for file in files:
                if file and allowed_file(file.filename):
                    # 원본 파일명 (확장자 제외)
                    original_filename = secure_filename(file.filename)
                    filename_without_ext = os.path.splitext(original_filename)[0]

                    # HEIC/HEIF 파일은 임시 파일로 저장 후 처리
                    file_ext = os.path.splitext(original_filename)[1].lower()
                    if file_ext in ['.heic', '.heif']:
                        # 임시 파일로 저장
                        temp_input_path = os.path.join(temp_dir, f"temp_{original_filename}")
                        file.save(temp_input_path)

                        # PIL Image로 열고 RGB로 변환하여 복사
                        with Image.open(temp_input_path) as img:
                            # RGB 모드로 변환하여 새 이미지 객체 생성 (원본과 독립)
                            image = img.convert('RGB')

                        # 임시 입력 파일 삭제 (이미지가 메모리에 로드됨)
                        try:
                            os.remove(temp_input_path)
                        except:
                            pass  # 파일 삭제 실패해도 계속 진행
                    else:
                        # 일반 이미지는 스트림에서 바로 열기
                        image = Image.open(file.stream)

                    # 4개 사이즈로 처리
                    for size in IMAGE_SIZES:
                        # 리사이즈 및 테두리 추가
                        processed_image = resize_image_with_border(image, size)

                        # 파일명 생성: 원본명-사이즈.jpg
                        output_filename = f"{filename_without_ext}-{size}.jpg"
                        output_path = os.path.join(temp_dir, output_filename)

                        # JPEG로 저장 (최상 품질)
                        processed_image.save(output_path, 'JPEG', quality=100)

            # ZIP 파일 생성
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # 임시 디렉토리의 모든 파일을 ZIP에 추가
                for filename in os.listdir(temp_dir):
                    file_path = os.path.join(temp_dir, filename)
                    zip_file.write(file_path, filename)

            zip_buffer.seek(0)

            # 임시 파일 삭제
            for filename in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, filename))
            os.rmdir(temp_dir)

            # ZIP 파일 전송
            return send_file(
                zip_buffer,
                mimetype='application/zip',
                as_attachment=True,
                download_name='processed-images.zip'
            )

        except Exception as e:
            # 임시 디렉토리 정리
            if os.path.exists(temp_dir):
                for filename in os.listdir(temp_dir):
                    try:
                        os.remove(os.path.join(temp_dir, filename))
                    except:
                        pass
                try:
                    os.rmdir(temp_dir)
                except:
                    pass
            raise e

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'이미지 처리 실패: {str(e)}'
        }), 500


def draw_circle_with_text(draw, text_line1, text_line2, center_x, center_y, font, circle_radius=50):
    """
    검정 원 배경과 함께 2줄 텍스트 그리기
    
    Args:
        draw: ImageDraw 객체
        text_line1: 첫 번째 줄 텍스트 (예: "선택")
        text_line2: 두 번째 줄 텍스트 (예: "01")
        center_x: 원 중심 x 좌표
        center_y: 원 중심 y 좌표
        font: ImageFont 객체
        circle_radius: 원 반경
    
    Returns:
        원의 오른쪽 끝 x 좌표
    """
    # 검정 원 그리기
    left = center_x - circle_radius
    top = center_y - circle_radius
    right = center_x + circle_radius
    bottom = center_y + circle_radius
    draw.ellipse([(left, top), (right, bottom)], fill=(0, 0, 0))
    
    # 텍스트 크기 측정
    bbox1 = draw.textbbox((0, 0), text_line1, font=font)
    text_width1 = bbox1[2] - bbox1[0]
    text_height1 = bbox1[3] - bbox1[1]
    
    bbox2 = draw.textbbox((0, 0), text_line2, font=font)
    text_width2 = bbox2[2] - bbox2[0]
    text_height2 = bbox2[3] - bbox2[1]
    
    # 총 텍스트 높이 (2줄 + 간격)
    line_spacing = 5
    total_text_height = text_height1 + text_height2 + line_spacing
    
    # 첫 번째 줄 위치 (원 중앙 상단)
    text1_x = center_x - (text_width1 / 2)
    text1_y = center_y - (total_text_height / 2)
    
    # 두 번째 줄 위치 (첫 번째 줄 아래)
    text2_x = center_x - (text_width2 / 2)
    text2_y = text1_y + text_height1 + line_spacing
    
    # 흰색 텍스트 그리기
    draw.text((text1_x, text1_y), text_line1, font=font, fill=(255, 255, 255))
    draw.text((text2_x, text2_y), text_line2, font=font, fill=(255, 255, 255))
    
    return right


def get_font(size=40, bold=False):
    """
    한글 폰트 가져오기
    
    Args:
        size: 폰트 크기
        bold: 볼드 여부
    
    Returns:
        ImageFont 객체
    """
    # Windows 기본 한글 폰트 경로
    font_paths = [
        'C:/Windows/Fonts/malgunbd.ttf',  # 맑은 고딕 Bold
        'C:/Windows/Fonts/malgun.ttf',     # 맑은 고딕
        'C:/Windows/Fonts/gulim.ttc',      # 굴림
        'C:/Windows/Fonts/NanumGothicBold.ttf',  # 나눔고딕 Bold
        'C:/Windows/Fonts/NanumGothic.ttf',      # 나눔고딕
    ]
    
    # Bold 폰트 우선 시도
    if bold:
        for font_path in font_paths:
            if os.path.exists(font_path) and 'bold' in font_path.lower():
                try:
                    return ImageFont.truetype(font_path, size)
                except:
                    pass
    
    # 일반 폰트 시도
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                pass
    
    # 폰트를 찾지 못한 경우 기본 폰트 사용
    return ImageFont.load_default()


@jsharp_bp.route('/jsharp/generate-option-image', methods=['POST'])
@jwt_required()
def generate_option_image():
    """
    옵션 이미지 생성
    - 1개 이미지(640px): 텍스트 상단 + 이미지 = 가로 640px
    - 2개 이미지(430px): 텍스트 상단 + 좌우 배치 이미지 = 가로 860px
    - 파일명: 선택#-상품명.jpg
    """
    try:
        # 파라미터 확인
        if 'images' not in request.files:
            return jsonify({
                'success': False,
                'message': '이미지 파일이 없습니다.'
            }), 400
        
        files = request.files.getlist('images')
        option_number = request.form.get('option_number', '01').strip()
        product_name = request.form.get('product_name', '').strip()
        image_order = request.form.get('image_order', 'left-right')
        
        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'message': '이미지 파일이 없습니다.'
            }), 400
        
        if not product_name:
            return jsonify({
                'success': False,
                'message': '상품명을 입력해주세요.'
            }), 400
        
        if len(files) > 2:
            return jsonify({
                'success': False,
                'message': '최대 2개의 이미지만 업로드할 수 있습니다.'
            }), 400
        
        # 이미지 로드
        images = []
        for file in files:
            if file and allowed_file(file.filename):
                img = Image.open(file.stream)
                # RGB 모드로 변환
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                images.append(img)
        
        if len(images) == 0:
            return jsonify({
                'success': False,
                'message': '유효한 이미지가 없습니다.'
            }), 400
        
        # 이미지 순서 조정 (right-left인 경우)
        if len(images) == 2 and image_order == 'right-left':
            images = [images[1], images[0]]
        
        # 최종 이미지 크기 결정
        if len(images) == 1:
            # 1개 이미지: 640px
            target_width = 640
            # 이미지 리사이즈
            img = images[0]
            aspect_ratio = img.height / img.width
            img_height = int(target_width * aspect_ratio)
            img = img.resize((target_width, img_height), Image.Resampling.LANCZOS)
            images[0] = img
        else:
            # 2개 이미지: 각각 430px, 총 860px
            target_width = 860
            resized_images = []
            for img in images:
                aspect_ratio = img.height / img.width
                img_width = 430
                img_height = int(img_width * aspect_ratio)
                img = img.resize((img_width, img_height), Image.Resampling.LANCZOS)
                resized_images.append(img)
            images = resized_images
        
        # 텍스트 영역 높이 계산
        text_area_height = 140  # 텍스트 영역 높이 (원 크기 고려)
        
        # 이미지 배치 높이 계산
        if len(images) == 1:
            images_height = images[0].height
        else:
            images_height = max(images[0].height, images[1].height)
        
        # 최종 캔버스 크기
        canvas_width = target_width
        canvas_height = text_area_height + images_height
        
        # 흰색 배경 캔버스 생성
        canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
        draw = ImageDraw.Draw(canvas)
        
        # 폰트 설정
        circle_font = get_font(size=24, bold=True)  # 원 안의 텍스트 폰트
        product_font = get_font(size=36, bold=False)  # 상품명 폰트
        
        # 원 그리기 (캔버스 중앙에서 시작)
        circle_radius = 50
        circle_center_x = (canvas_width / 2) - 100  # 중앙에서 약간 왼쪽
        circle_center_y = text_area_height / 2
        
        # 검정 원 + "선택" "번호" 2줄 텍스트
        circle_right = draw_circle_with_text(
            draw, "선택", option_number,
            circle_center_x, circle_center_y,
            circle_font, circle_radius
        )
        
        # 상품명 텍스트 (원 오른쪽)
        product_text_x = circle_right + 20  # 원에서 20px 간격
        product_text_y = circle_center_y - 18  # 세로 중앙 정렬
        draw.text((product_text_x, product_text_y), product_name, font=product_font, fill=(50, 50, 50))
        
        # 이미지 배치
        if len(images) == 1:
            # 1개 이미지: 중앙 배치
            canvas.paste(images[0], (0, text_area_height))
        else:
            # 2개 이미지: 좌우 배치
            canvas.paste(images[0], (0, text_area_height))
            canvas.paste(images[1], (430, text_area_height))
        
        # 이미지를 바이트 버퍼로 저장 (최상 품질)
        img_buffer = io.BytesIO()
        canvas.save(img_buffer, 'JPEG', quality=100)
        img_buffer.seek(0)

        # 파일명 생성: 선택#-상품명.jpg
        filename = f"선택{option_number}-{product_name}.jpg"
        
        # 파일 전송
        return send_file(
            img_buffer,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        print(f"옵션 이미지 생성 오류: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'이미지 생성 실패: {str(e)}'
        }), 500


@jsharp_bp.route('/jsharp/merge-images', methods=['POST'])
@jwt_required()
def merge_images():
    """
    2개의 430px 이미지를 860px × 430px로 병합
    """
    try:
        # 파라미터 확인
        if 'images' not in request.files:
            return jsonify({
                'success': False,
                'message': '이미지 파일이 없습니다.'
            }), 400
        
        files = request.files.getlist('images')
        image_order = request.form.get('image_order', 'left-right')
        
        if not files or len(files) != 2:
            return jsonify({
                'success': False,
                'message': '정확히 2개의 이미지를 업로드해주세요.'
            }), 400
        
        # 이미지 로드
        images = []
        for file in files:
            if file and allowed_file(file.filename):
                img = Image.open(file.stream)
                # RGB 모드로 변환
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                images.append(img)
        
        if len(images) != 2:
            return jsonify({
                'success': False,
                'message': '유효한 이미지가 2개가 아닙니다.'
            }), 400
        
        # 이미지 순서 조정 (right-left인 경우)
        if image_order == 'right-left':
            images = [images[1], images[0]]
        
        # 각 이미지를 430px 너비로 리사이즈
        resized_images = []
        target_width = 430
        
        for img in images:
            aspect_ratio = img.height / img.width
            img_height = int(target_width * aspect_ratio)
            resized_img = img.resize((target_width, img_height), Image.Resampling.LANCZOS)
            resized_images.append(resized_img)
        
        # 두 이미지의 높이 중 최대값 사용
        max_height = max(resized_images[0].height, resized_images[1].height)
        
        # 860 × max_height 캔버스 생성
        canvas_width = 860
        canvas_height = max_height
        canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
        
        # 이미지 병합 (좌우 배치)
        # 각 이미지를 세로 중앙 정렬
        y_offset_left = (canvas_height - resized_images[0].height) // 2
        y_offset_right = (canvas_height - resized_images[1].height) // 2
        
        canvas.paste(resized_images[0], (0, y_offset_left))
        canvas.paste(resized_images[1], (430, y_offset_right))
        
        # 이미지를 바이트 버퍼로 저장 (최상 품질)
        img_buffer = io.BytesIO()
        canvas.save(img_buffer, 'JPEG', quality=100)
        img_buffer.seek(0)

        # 파일 전송
        return send_file(
            img_buffer,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name='merged-image.jpg'
        )
    
    except Exception as e:
        print(f"이미지 병합 오류: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'이미지 병합 실패: {str(e)}'
        }), 500


def allowed_excel_file(filename):
    """허용된 엑셀 파일 확장자 확인"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXCEL_EXTENSIONS


def detect_site_from_excel(file_stream, column_mappings):
    """
    엑셀 파일에서 헤더행 위치를 찾고 사이트를 자동 감지 (새로운 방식)
    find_header_row_and_detect_site를 래핑하여 기존 인터페이스 유지

    Args:
        file_stream: 파일 스트림
        column_mappings: 사용자가 정의한 각 사이트별 컬럼 매핑 정보

    Returns:
        str: 감지된 사이트명 ('ebay', 'smartstore', '11st', 'coupang', 또는 None)
    """
    site, header_row, df = find_header_row_and_detect_site(file_stream, column_mappings)
    return site


def parse_excel_with_mapping(file_stream, site, column_mapping, replacement_rules=None):
    """
    사용자 정의 컬럼 매핑을 사용하여 엑셀 파일 파싱 (새로운 방식)

    Args:
        file_stream: 파일 스트림
        site: 사이트명
        column_mapping: 사용자가 정의한 컬럼 매핑 (dict)
        replacement_rules: 필드 치환 규칙 딕셔너리 (optional)
                          {'product_name': [...], 'option': [...], 'additional_items': [...]}

    Returns:
        dict: 파싱된 주문 데이터 리스트
    """
    try:
        # 헤더 행 찾기
        file_stream.seek(0)
        site_dict = {site: column_mapping}
        detected_site, header_row, df = find_header_row_and_detect_site(file_stream, site_dict)
        
        if df is None:
            return {'success': False, 'message': f'{site} 엑셀 파일에서 헤더를 찾을 수 없습니다.'}

        orders = []
        
        # 컬럼 매핑 정보를 파싱
        column_map = {}  # {field_name: actual_column_name}
        for field, col_ref in column_mapping.items():
            if not col_ref:
                continue
            col_index, search_text = parse_column_reference(col_ref)
            if col_index is not None:
                # 헤더에서 실제 컬럼명 찾기
                if col_index < len(df.columns):
                    column_map[field] = df.columns[col_index]
        
        # 데이터 행 순회
        for idx, row in df.iterrows():
            try:
                # eBay의 경우 A열(첫 번째 컬럼) 값을 site로 사용
                actual_site = site
                order_number = str(row.get(column_map.get('order_number', ''), '') or '')

                if site == 'ebay' and len(df.columns) > 0:
                    # A열 값 (판매자 아이디) 가져오기
                    col_a_value = str(row.iloc[0] if len(row) > 0 else '')
                    # A열 값을 site로 사용
                    if col_a_value and col_a_value != 'nan':
                        actual_site = col_a_value

                order = {
                    'site': actual_site,
                    'order_number': order_number,
                    'buyer_name': str(row.get(column_map.get('buyer_name', ''), '') or ''),
                    'recipient_name': str(row.get(column_map.get('recipient_name', ''), '') or ''),
                    'phone': str(row.get(column_map.get('phone', ''), '') or ''),
                    'phone2': str(row.get(column_map.get('phone2', ''), '') or ''),
                    'address': str(row.get(column_map.get('address', ''), '') or ''),
                    'delivery_memo': str(row.get(column_map.get('delivery_memo', ''), '') or ''),
                    'product_name': str(row.get(column_map.get('product_name', ''), '') or ''),
                    'quantity': safe_int(row.get(column_map.get('quantity', ''), 1), 1),
                    'option': str(row.get(column_map.get('option', ''), '') or ''),
                    'additional_items': str(row.get(column_map.get('additional_items', ''), '') or ''),
                    'price': safe_float(row.get(column_map.get('price', ''), 0), 0),
                    'order_date': str(row.get(column_map.get('order_date', ''), '') or ''),
                }
                
                # 필드 치환 적용
                if replacement_rules:
                    # 상품명 치환
                    if order['product_name'] and replacement_rules.get('product_name'):
                        order['product_name'] = apply_field_replacements(
                            order['product_name'], 
                            replacement_rules['product_name']
                        )
                    
                    # 옵션 치환
                    if order['option'] and replacement_rules.get('option'):
                        order['option'] = apply_field_replacements(
                            order['option'], 
                            replacement_rules['option']
                        )
                    
                    # 추가구성 치환
                    if order['additional_items'] and replacement_rules.get('additional_items'):
                        order['additional_items'] = apply_field_replacements(
                            order['additional_items'], 
                            replacement_rules['additional_items']
                        )
                
                # 빈 행 건너뛰기 (필수 필드가 모두 비어있으면)
                if not order['recipient_name'] and not order['product_name']:
                    continue
                    
                orders.append(order)
            except Exception as e:
                print(f"Row {idx} parsing error: {e}")
                continue

        return {'success': True, 'orders': orders, 'count': len(orders)}

    except Exception as e:
        print(f"Excel parsing error: {str(e)}")
        return {'success': False, 'message': f'{site} 엑셀 파싱 오류: {str(e)}'}


@jsharp_bp.route('/jsharp/parse-order-excel', methods=['POST'])
@jwt_required()
def parse_order_excel():
    """
    주문 엑셀 파일 파싱 및 통합 (사용자 정의 컬럼 매핑 기반)
    업로드된 엑셀 파일을 사용자가 정의한 컬럼 매핑을 사용하여 파싱
    """
    try:
        # 업로드된 파일 확인
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'message': '파일이 없습니다.'
            }), 400

        files = request.files.getlist('files')

        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'message': '파일이 없습니다.'
            }), 400

        # 컬럼 매핑 정보 가져오기 (JSON 형식)
        import json
        column_mappings_json = request.form.get('columnMappings', '{}')
        try:
            column_mappings = json.loads(column_mappings_json)
        except:
            return jsonify({
                'success': False,
                'message': '컬럼 매핑 정보가 유효하지 않습니다.'
            }), 400

        # 필드 치환 규칙 가져오기 (새로운 형식)
        replacement_rules_json = request.form.get('replacementRules', '{}')
        try:
            replacement_rules = json.loads(replacement_rules_json)
            # 형식 검증: {product_name: [...], option: [...], additional_items: [...]}
            if not isinstance(replacement_rules, dict):
                replacement_rules = {}
        except:
            replacement_rules = {}

        # 사이트별 비밀번호 가져오기
        site_passwords_json = request.form.get('sitePasswords', '{}')
        try:
            site_passwords = json.loads(site_passwords_json)
            if not isinstance(site_passwords, dict):
                site_passwords = {}
        except:
            site_passwords = {}
        print(f"[DEBUG] Site passwords configured: {list(site_passwords.keys())}")

        if not column_mappings:
            return jsonify({
                'success': False,
                'message': '컬럼 매핑 정보가 없습니다. "사이트별 칼럼 지정" 탭에서 각 쇼핑몰의 컬럼을 먼저 설정해주세요.'
            }), 400

        all_orders = []
        processed_sites = []

        site_labels = {
            'ebay': 'eBay',
            'smartstore': '스마트스토어',
            '11st': '11번가',
            'coupang': '쿠팡'
        }

        # 각 파일 처리
        for file in files:
            if file and file.filename and allowed_excel_file(file.filename):
                print(f"[DEBUG] Processing file: {file.filename}")
                # 임시로 파일을 메모리에 저장
                file_content = io.BytesIO(file.read())
                print(f"[DEBUG] File size: {len(file_content.getvalue())} bytes")

                # 사이트 자동 감지를 위해 먼저 모든 사이트 비밀번호로 시도
                detected_site = None
                decrypted_content = None

                # 사이트 자동 감지 (사용자 정의 컬럼 매핑 기반)
                print(f"[DEBUG] Detecting site for file: {file.filename}")
                print(f"[DEBUG] Available column mappings: {list(column_mappings.keys())}")

                # 각 사이트의 비밀번호로 암호 해제 시도
                for site, password in site_passwords.items():
                    if password:
                        test_content = decrypt_excel_file(io.BytesIO(file_content.getvalue()), password)
                        test_detected_site = detect_site_from_excel(test_content, column_mappings)
                        if test_detected_site:
                            print(f"[DEBUG] File decrypted successfully with {site} password")
                            detected_site = test_detected_site
                            decrypted_content = test_content
                            break

                # 비밀번호로 해제되지 않으면 원본 파일로 감지 시도
                if not detected_site:
                    file_content.seek(0)
                    detected_site = detect_site_from_excel(file_content, column_mappings)
                    decrypted_content = file_content
                print(f"[DEBUG] Detected site: {detected_site}")

                if detected_site and detected_site in column_mappings:
                    # 파일 스트림 위치를 처음으로 리셋
                    decrypted_content.seek(0)

                    # 파싱 (사용자 정의 컬럼 매핑 + 치환 규칙 사용)
                    print(f"[DEBUG] Parsing file as {detected_site}")
                    result = parse_excel_with_mapping(
                        decrypted_content,
                        detected_site,
                        column_mappings[detected_site],
                        replacement_rules
                    )
                    print(f"[DEBUG] Parse result: success={result.get('success')}, orders={len(result.get('orders', []))}")

                    if result['success']:
                        all_orders.extend(result['orders'])
                        processed_sites.append(site_labels.get(detected_site, detected_site))
                        print(f"[DEBUG] Successfully added {len(result['orders'])} orders from {detected_site}")
                    else:
                        print(f"[ERROR] Parsing failed: {result.get('message')}")
                else:
                    print(f"[ERROR] Could not detect site for '{file.filename}'. detected_site={detected_site}, available={list(column_mappings.keys())}")

        if len(all_orders) == 0:
            return jsonify({
                'success': False,
                'message': '유효한 주문 데이터가 없습니다. 컬럼 매핑 설정을 확인하고 지원되는 쇼핑몰(eBay, 스마트스토어, 11번가, 쿠팡)의 엑셀 파일을 업로드해주세요.'
            }), 400

        # DB에 저장 (중복 체크)
        saved_count = 0
        duplicate_count = 0
        failed_count = 0

        print(f"[DEBUG] Saving {len(all_orders)} orders to database...")
        for idx, order in enumerate(all_orders):
            success, msg, is_duplicate = insert_order(order)
            print(f"[DEBUG] Order {idx+1}/{len(all_orders)}: {order.get('order_number', 'N/A')} - {order.get('product_name', 'N/A')[:30]} -> success={success}, duplicate={is_duplicate}")
            if success:
                saved_count += 1
            elif is_duplicate:
                duplicate_count += 1
            else:
                failed_count += 1
                print(f"[ERROR] Failed to save order: {msg}")

        print(f"[DEBUG] Save complete: saved={saved_count}, duplicate={duplicate_count}, failed={failed_count}")
        
        # 주문일자 기준으로 정렬 (최신순)
        try:
            all_orders.sort(key=lambda x: x['order_date'], reverse=True)
        except:
            pass  # 정렬 실패해도 계속 진행

        sites_str = ', '.join(set(processed_sites))
        message = f'{sites_str}에서 {len(all_orders)}개의 주문을 가져왔습니다.'
        if duplicate_count > 0:
            message += f' ({duplicate_count}개 중복, {saved_count}개 신규 저장)'
        
        return jsonify({
            'success': True,
            'orders': all_orders,
            'count': len(all_orders),
            'saved_count': saved_count,
            'duplicate_count': duplicate_count,
            'sites': list(set(processed_sites)),
            'message': message
        })

    except Exception as e:
        print(f"주문 엑셀 파싱 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'주문 데이터 처리 실패: {str(e)}'
        }), 500


@jsharp_bp.route('/jsharp/get-orders', methods=['GET'])
@jwt_required()
def get_orders():
    """
    DB에서 주문 목록 조회
    """
    try:
        site = request.args.get('site', None)
        limit = request.args.get('limit', type=int)
        
        orders = get_all_orders(site=site, limit=limit)
        
        return jsonify({
            'success': True,
            'orders': orders,
            'count': len(orders)
        })
        
    except Exception as e:
        print(f"주문 조회 오류: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'주문 조회 실패: {str(e)}'
        }), 500


@jsharp_bp.route('/jsharp/delete-order/<int:order_id>', methods=['DELETE'])
@jwt_required()
def delete_order_route(order_id):
    """주문 삭제"""
    try:
        success, message = delete_order(order_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'주문 삭제 실패: {str(e)}'
        }), 500


@jsharp_bp.route('/jsharp/update-order-status/<int:order_id>', methods=['PUT'])
@jwt_required()
def update_order_status_route(order_id):
    """주문 상태 업데이트"""
    try:
        data = request.get_json()
        status = data.get('status', 'pending')
        
        if status not in ['pending', 'completed']:
            return jsonify({
                'success': False,
                'message': '유효하지 않은 상태값입니다. (pending 또는 completed만 가능)'
            }), 400
        
        success, message = update_order_status(order_id, status)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'상태 업데이트 실패: {str(e)}'
        }), 500


@jsharp_bp.route('/jsharp/export-orders', methods=['POST'])
@jwt_required()
def export_orders():
    """선택된 주문들을 로젠 형식의 엑셀로 내보내기"""
    try:
        data = request.get_json()
        export_rows = data.get('export_rows', [])
        logen_mapping = data.get('logen_mapping', {})

        if not export_rows:
            return jsonify({
                'success': False,
                'message': '내보낼 주문이 없습니다.'
            }), 400

        # 엑셀 생성 - 컬럼 순서를 "A/텍스트" 형식의 A, B, C 순서대로 정렬
        # 먼저 컬럼 순서를 파싱
        column_order = []  # [(column_index, header_text, field_name), ...]

        for field_name, column_ref in logen_mapping.items():
            if not column_ref:
                continue

            # "A/텍스트" 형식 파싱
            if '/' in column_ref:
                parts = column_ref.split('/', 1)
                column_letter = parts[0].strip().upper()
                header_text = parts[1].strip()

                # 컬럼 문자를 숫자로 변환 (A=0, B=1, ...)
                column_index = 0
                for char in column_letter:
                    if char.isalpha():
                        column_index = column_index * 26 + (ord(char) - ord('A') + 1)
                column_index -= 1

                column_order.append((column_index, header_text, field_name))
            else:
                # 슬래시가 없으면 필드명을 헤더로 사용
                column_order.append((9999, field_name, field_name))  # 맨 뒤로

        # 컬럼 순서대로 정렬
        column_order.sort(key=lambda x: x[0])

        # ExportRow 필드와 매핑
        field_mapping = {
            'recipient_name': 'recipient_name',
            'phone': 'phone',
            'phone2': 'phone2',
            'address': 'address',
            'quantity': 'quantity',
            'delivery_memo': 'delivery_memo',
            'parcel_quantity': 'parcel_quantity',
            'parcel_fee': 'parcel_fee'
        }

        # 최대 컬럼 인덱스 찾기
        max_column_index = max([col_idx for col_idx, _, _ in column_order]) if column_order else 0

        # 모든 컬럼 헤더 생성 (빈 열 포함)
        all_headers = [''] * (max_column_index + 1)
        column_field_map = {}  # {column_index: field_name}

        for col_idx, header_text, field_name in column_order:
            all_headers[col_idx] = header_text
            column_field_map[col_idx] = field_name

        # 데이터 생성 (빈 열 포함)
        df_data = []
        for export_row in export_rows:
            row_data = []

            # 모든 컬럼 인덱스에 대해 데이터 추가 (빈 열 포함)
            for col_idx in range(max_column_index + 1):
                if col_idx in column_field_map:
                    field_name = column_field_map[col_idx]
                    row_field = field_mapping.get(field_name)
                    if row_field:
                        row_data.append(export_row.get(row_field, ''))
                    else:
                        row_data.append('')
                else:
                    # 매핑되지 않은 열은 빈 값
                    row_data.append('')

            df_data.append(row_data)

        # DataFrame 생성 (컬럼 순서 및 빈 열 유지)
        if column_order:
            df = pd.DataFrame(df_data, columns=all_headers)
        else:
            df = pd.DataFrame(df_data)
        
        # 엑셀 파일 생성
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='주문목록')
        output.seek(0)
        
        # 파일명 생성
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'logen_orders_{timestamp}.xlsx'
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"엑셀 내보내기 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'엑셀 내보내기 실패: {str(e)}'
        }), 500


# 설정 파일 저장 경로
SETTINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'jsharp_settings')

@jsharp_bp.route('/jsharp/save-settings', methods=['POST'])
@jwt_required()
def save_settings():
    """설정을 서버 txt 파일로 저장"""
    try:
        data = request.get_json()
        column_mappings = data.get('column_mappings', {})
        replacement_rules = data.get('replacement_rules', {})

        # 디렉토리 생성
        os.makedirs(SETTINGS_DIR, exist_ok=True)

        # 컬럼 매핑 저장
        import json
        column_mappings_path = os.path.join(SETTINGS_DIR, 'column_mappings.txt')
        with open(column_mappings_path, 'w', encoding='utf-8') as f:
            json.dump(column_mappings, f, ensure_ascii=False, indent=2)

        # 치환 규칙 저장
        replacement_rules_path = os.path.join(SETTINGS_DIR, 'replacement_rules.txt')
        with open(replacement_rules_path, 'w', encoding='utf-8') as f:
            json.dump(replacement_rules, f, ensure_ascii=False, indent=2)

        return jsonify({
            'success': True,
            'message': '설정이 서버에 저장되었습니다.'
        })

    except Exception as e:
        print(f"설정 저장 오류: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'설정 저장 실패: {str(e)}'
        }), 500


@jsharp_bp.route('/jsharp/load-settings', methods=['GET'])
@jwt_required()
def load_settings():
    """서버에서 설정 파일 불러오기"""
    try:
        import json
        result = {
            'column_mappings': None,
            'replacement_rules': None
        }

        # 컬럼 매핑 불러오기
        column_mappings_path = os.path.join(SETTINGS_DIR, 'column_mappings.txt')
        if os.path.exists(column_mappings_path):
            with open(column_mappings_path, 'r', encoding='utf-8') as f:
                result['column_mappings'] = json.load(f)

        # 치환 규칙 불러오기
        replacement_rules_path = os.path.join(SETTINGS_DIR, 'replacement_rules.txt')
        if os.path.exists(replacement_rules_path):
            with open(replacement_rules_path, 'r', encoding='utf-8') as f:
                result['replacement_rules'] = json.load(f)

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        print(f"설정 불러오기 오류: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'설정 불러오기 실패: {str(e)}'
        }), 500

