#!/bin/bash
# Flask 백엔드 시작 스크립트
# 사용법: ./start.sh

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")"

# 가상환경 활성화
source venv/bin/activate

# Flask 서버 시작
python run.py
