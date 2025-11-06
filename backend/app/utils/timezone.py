"""
Timezone utilities
한국 시간대(KST) 관련 유틸리티 함수
"""
from datetime import datetime, timezone, timedelta

# 한국 시간대 설정 (UTC+9)
KST = timezone(timedelta(hours=9))


def get_kst_now():
    """
    한국 시간대 현재 시각 반환
    Returns:
        str: 'YYYY-MM-DD HH:MM:SS' 형식의 한국 시간
    """
    return datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')


def utc_to_kst(utc_time_str):
    """
    UTC 시간 문자열을 한국 시간으로 변환
    Args:
        utc_time_str: 'YYYY-MM-DD HH:MM:SS' 형식의 UTC 시간 문자열
    Returns:
        str: 'YYYY-MM-DD HH:MM:SS' 형식의 한국 시간
    """
    if not utc_time_str:
        return None

    try:
        # UTC 시간 파싱
        utc_time = datetime.strptime(utc_time_str, '%Y-%m-%d %H:%M:%S')
        utc_time = utc_time.replace(tzinfo=timezone.utc)

        # 한국 시간으로 변환
        kst_time = utc_time.astimezone(KST)

        return kst_time.strftime('%Y-%m-%d %H:%M:%S')
    except Exception as e:
        print(f"시간 변환 오류: {e}")
        return utc_time_str
