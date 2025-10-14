# 환경변수 설정을 위한 배치 파일
# 이 파일을 실행하면 현재 세션에서 가상환경 Python을 사용할 수 있습니다.

@echo off
echo 가상환경 Python 경로를 PATH에 추가합니다...
set PATH=E:\zData\Webtranet\Webtrarev02\backend\venv\Scripts;%PATH%
echo 완료! 이제 python run.py로 서버를 시작할 수 있습니다.
echo.
echo 현재 Python 경로:
where python
echo.
cd /d "E:\zData\Webtranet\Webtrarev02\backend"