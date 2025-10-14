from flask import Blueprint, jsonify
import requests
from random import randint
from deep_translator import GoogleTranslator

tatoeba_bp = Blueprint('tatoeba', __name__, url_prefix='/api/tatoeba')

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
    긴 문장(최소 50자 이상)만 반환합니다.
    """
    try:
        # 랜덤 페이지에서 여러 문장 가져오기
        random_page = randint(1, 200)  # 중간 범위로 설정
        min_length = 40  # 최소 문자 수를 조금 낮춤 (50 -> 40)

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
                # 문장 길이로 정렬하고 가장 긴 것 선택
                sentences = data['results']
                long_sentences = [s for s in sentences if len(s.get('text', '')) >= min_length]

                if long_sentences:
                    # 가장 긴 문장 선택
                    sentence = max(long_sentences, key=lambda s: len(s.get('text', '')))
                    english_text = sentence.get('text')

                    # 한국어로 번역
                    korean_text = translate_to_korean(english_text)

                    return jsonify({
                        'success': True,
                        'sentence': {
                            'id': sentence.get('id'),
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
                        sentence = max(long_sentences, key=lambda s: len(s.get('text', '')))
                        english_text = sentence.get('text')
                        korean_text = translate_to_korean(english_text)

                        return jsonify({
                            'success': True,
                            'sentence': {
                                'id': sentence.get('id'),
                                'text': english_text,
                                'translation': korean_text or '번역을 가져올 수 없습니다.',
                                'lang': sentence.get('lang')
                            }
                        })
            else:
                raise

        # 긴 문장을 찾지 못한 경우 대체 문장 사용
        fallback_text = "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle."
        fallback_translation = translate_to_korean(fallback_text)

        return jsonify({
            'success': True,
            'sentence': {
                'id': 0,
                'text': fallback_text,
                'translation': fallback_translation or '위대한 일을 하는 유일한 방법은 당신이 하는 일을 사랑하는 것입니다. 아직 찾지 못했다면 계속 찾으세요. 타협하지 마세요.',
                'lang': 'eng'
            }
        })

    except requests.exceptions.RequestException as e:
        # 네트워크 오류 또는 API 오류 시 대체 문장 반환
        print(f"Tatoeba API error: {str(e)}")
        fallback_text = "Success is not final, failure is not fatal: it is the courage to continue that counts."
        fallback_translation = translate_to_korean(fallback_text)

        return jsonify({
            'success': True,
            'sentence': {
                'id': 0,
                'text': fallback_text,
                'translation': fallback_translation or '성공은 최종적인 것이 아니고, 실패는 치명적인 것이 아닙니다. 중요한 것은 계속할 수 있는 용기입니다.',
                'lang': 'eng'
            }
        })
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch sentence'
        }), 500
