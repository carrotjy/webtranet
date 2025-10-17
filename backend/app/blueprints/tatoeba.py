from flask import Blueprint, jsonify
import requests
from random import randint, seed, choice
from datetime import datetime
from deep_translator import GoogleTranslator

tatoeba_bp = Blueprint('tatoeba', __name__, url_prefix='/api/tatoeba')

# 최근 사용된 문장 ID를 저장 (메모리에 최대 100개 유지)
recent_sentence_ids = []
MAX_RECENT_IDS = 100

def translate_to_korean(text):
    """
    영어 텍스트를 한국어로 번역합니다.
    """
    try:
        translator = GoogleTranslator(source='en', target='ko')
        translated = translator.translate(text)
        return translated
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return None

@tatoeba_bp.route('/random-sentence', methods=['GET'])
def get_random_sentence():
    """
    Tatoeba.org API에서 랜덤 영어 문장을 가져오고 한국어로 번역합니다.
    CORS 문제를 해결하기 위한 프록시 엔드포인트입니다.
    긴 문장(최소 40자 이상)만 반환합니다.
    날짜와 시간 기반 시드로 매번 다른 문장을 보장합니다.
    """
    global recent_sentence_ids

    try:
        # 날짜와 시간 기반으로 시드 설정 (시간 단위로 변경)
        current_datetime = datetime.now()
        date_seed = int(current_datetime.strftime('%Y%m%d%H'))  # 시간 단위
        seed(date_seed)

        # 랜덤 페이지에서 여러 문장 가져오기 (더 넓은 범위)
        random_page = randint(1, 500)  # 범위 확대: 200 -> 500
        min_length = 40  # 최소 문자 수

        # Tatoeba API 호출 - 한 번에 20개 가져와서 긴 것 선택
        url = f'https://tatoeba.org/en/api_v0/search'
        params = {
            'from': 'eng',
            'to': '',
            'query': '',
            'page': random_page,
            'per_page': 20  # 10개 -> 20개로 증가
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # 결과에서 긴 문장 찾기
            if data.get('results') and len(data['results']) > 0:
                # 문장 길이로 필터링
                sentences = data['results']
                long_sentences = [s for s in sentences if len(s.get('text', '')) >= min_length]

                if long_sentences:
                    # 최근에 사용하지 않은 문장 필터링
                    unused_sentences = [s for s in long_sentences if s.get('id') not in recent_sentence_ids]

                    # 사용 가능한 문장이 없으면 전체 목록 사용
                    if not unused_sentences:
                        unused_sentences = long_sentences

                    # 다양한 길이의 문장 중에서 랜덤 선택 (항상 가장 긴 것만 선택하지 않음)
                    if len(unused_sentences) > 1:
                        sentence = choice(unused_sentences)
                    else:
                        sentence = unused_sentences[0]

                    sentence_id = sentence.get('id')
                    english_text = sentence.get('text')

                    # 사용한 문장 ID 기록
                    recent_sentence_ids.append(sentence_id)
                    if len(recent_sentence_ids) > MAX_RECENT_IDS:
                        recent_sentence_ids.pop(0)  # 오래된 ID 제거

                    # 한국어로 번역
                    korean_text = translate_to_korean(english_text)

                    return jsonify({
                        'success': True,
                        'sentence': {
                            'id': sentence_id,
                            'text': english_text,
                            'translation': korean_text or '번역을 가져올 수 없습니다.',
                            'lang': sentence.get('lang')
                        }
                    })
        except requests.exceptions.HTTPError as e:
            # 400 에러 등이 발생하면 더 낮은 페이지로 재시도
            if e.response.status_code == 400:
                random_page = randint(1, 50)  # 안전한 범위로 재시도
                params['page'] = random_page

                response = requests.get(url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()

                if data.get('results') and len(data['results']) > 0:
                    sentences = data['results']
                    long_sentences = [s for s in sentences if len(s.get('text', '')) >= min_length]

                    if long_sentences:
                        # 중복 방지 로직 적용
                        unused_sentences = [s for s in long_sentences if s.get('id') not in recent_sentence_ids]
                        if not unused_sentences:
                            unused_sentences = long_sentences

                        sentence = choice(unused_sentences) if len(unused_sentences) > 1 else unused_sentences[0]
                        sentence_id = sentence.get('id')
                        english_text = sentence.get('text')

                        # 사용한 문장 ID 기록
                        recent_sentence_ids.append(sentence_id)
                        if len(recent_sentence_ids) > MAX_RECENT_IDS:
                            recent_sentence_ids.pop(0)

                        korean_text = translate_to_korean(english_text)

                        return jsonify({
                            'success': True,
                            'sentence': {
                                'id': sentence_id,
                                'text': english_text,
                                'translation': korean_text or '번역을 가져올 수 없습니다.',
                                'lang': sentence.get('lang')
                            }
                        })
            else:
                raise

        # 긴 문장을 찾지 못한 경우 날짜별로 다른 대체 문장 사용
        fallback_sentences = [
            ("The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
             "위대한 일을 하는 유일한 방법은 당신이 하는 일을 사랑하는 것입니다. 아직 찾지 못했다면 계속 찾으세요. 타협하지 마세요."),
            ("Success is not the key to happiness. Happiness is the key to success. If you love what you are doing, you will be successful.",
             "성공이 행복의 열쇠가 아닙니다. 행복이 성공의 열쇠입니다. 당신이 하는 일을 사랑한다면 성공할 것입니다."),
            ("The future belongs to those who believe in the beauty of their dreams.",
             "미래는 자신의 꿈의 아름다움을 믿는 사람들의 것입니다."),
            ("In the middle of difficulty lies opportunity.",
             "어려움의 한가운데에 기회가 있습니다."),
            ("The best time to plant a tree was 20 years ago. The second best time is now.",
             "나무를 심기에 가장 좋은 때는 20년 전이었습니다. 두 번째로 좋은 때는 지금입니다.")
        ]

        # 날짜를 기반으로 대체 문장 선택
        day_of_year = current_datetime.timetuple().tm_yday
        fallback_index = day_of_year % len(fallback_sentences)
        fallback_text, fallback_translation = fallback_sentences[fallback_index]

        return jsonify({
            'success': True,
            'sentence': {
                'id': 0,
                'text': fallback_text,
                'translation': fallback_translation,
                'lang': 'eng'
            }
        })

    except requests.exceptions.RequestException as e:
        # 네트워크 오류 또는 API 오류 시 날짜별 대체 문장 반환
        print(f"Tatoeba API error: {str(e)}")

        fallback_sentences = [
            ("Success is not final, failure is not fatal: it is the courage to continue that counts.",
             "성공은 최종적인 것이 아니고, 실패는 치명적인 것이 아닙니다. 중요한 것은 계속할 수 있는 용기입니다."),
            ("The only impossible journey is the one you never begin.",
             "불가능한 유일한 여정은 시작하지 않은 여정입니다."),
            ("Believe you can and you're halfway there.",
             "할 수 있다고 믿으면 이미 절반은 온 것입니다."),
            ("Everything you've ever wanted is on the other side of fear.",
             "당신이 원했던 모든 것은 두려움 너머에 있습니다."),
            ("Dream big and dare to fail.",
             "크게 꿈꾸고 실패를 두려워하지 마세요.")
        ]

        current_datetime = datetime.now()
        day_of_year = current_datetime.timetuple().tm_yday
        fallback_index = day_of_year % len(fallback_sentences)
        fallback_text, fallback_translation = fallback_sentences[fallback_index]

        return jsonify({
            'success': True,
            'sentence': {
                'id': 0,
                'text': fallback_text,
                'translation': fallback_translation,
                'lang': 'eng'
            }
        })
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch sentence'
        }), 500
