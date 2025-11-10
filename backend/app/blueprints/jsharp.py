"""
JSharp Blueprint
J# 이미지 처리 관련 API 엔드포인트
"""
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from PIL import Image, ImageDraw, ImageFont
import os
import io
import zipfile
import tempfile

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
IMAGE_SIZES = [430, 640, 860, 1000]


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

