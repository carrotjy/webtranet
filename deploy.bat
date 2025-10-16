@echo off
REM Webtranet 자동 배포 스크립트 (Windows)

echo ======================================
echo Webtranet 배포 스크립트 (Windows)
echo ======================================

REM 1. 백엔드 설정
echo.
echo [1/5] 백엔드 설정 중...
cd backend

REM 가상환경 생성
if not exist "venv" (
    echo 가상환경 생성 중...
    python -m venv venv
)

REM 가상환경 활성화
call venv\Scripts\activate

REM 패키지 설치
echo 패키지 설치 중...
pip install -r requirements.txt
pip install -r requirements_pdf.txt

REM .env 파일 생성 (없는 경우)
if not exist ".env" (
    echo 환경 변수 파일 생성 중...
    (
        echo SECRET_KEY=your-secret-key-change-this-in-production
        echo JWT_SECRET_KEY=your-jwt-secret-key-change-this-in-production
        echo FLASK_ENV=production
    ) > .env
    echo .env 파일이 생성되었습니다.
    echo 주의: .env 파일의 SECRET_KEY를 반드시 변경하세요!
) else (
    echo .env 파일이 이미 존재합니다.
)

REM 데이터베이스 초기화/마이그레이션
echo 데이터베이스 초기화 중...
python app\database\init_db.py

cd ..

REM 2. 프론트엔드 설정
echo.
echo [2/5] 프론트엔드 설정 중...
cd frontend

REM Node 패키지 설치
if not exist "node_modules" (
    echo Node 패키지 설치 중...
    call npm install
)

REM 프로덕션 빌드
echo 프론트엔드 빌드 중...
call npm run build

cd ..

REM 3. Gunicorn 대신 waitress 설치 (Windows용)
echo.
echo [3/5] Waitress 설치 확인 중...
cd backend
call venv\Scripts\activate
pip install waitress
cd ..

REM 4. 서비스 시작 스크립트 생성
echo.
echo [4/5] 서비스 시작 스크립트 생성 중...

REM start_services.bat 생성
(
    echo @echo off
    echo REM 백엔드 시작
    echo cd backend
    echo call venv\Scripts\activate
    echo start /B waitress-serve --host=0.0.0.0 --port=5000 app:create_app
    echo echo 백엔드 서버가 시작되었습니다 ^(포트 5000^)
    echo cd ..
    echo.
    echo REM 프론트엔드 시작 ^(옵션^)
    echo cd frontend
    echo start /B npm run preview
    echo echo 프론트엔드 서버가 시작되었습니다 ^(포트 4173^)
    echo cd ..
    echo.
    echo echo 모든 서비스가 시작되었습니다.
    echo pause
) > start_services.bat

REM stop_services.bat 생성
(
    echo @echo off
    echo REM Python 프로세스 종료
    echo taskkill /F /IM python.exe /T 2^>nul
    echo taskkill /F /IM node.exe /T 2^>nul
    echo echo 모든 서비스가 정지되었습니다.
    echo pause
) > stop_services.bat

REM 5. 완료
echo.
echo ======================================
echo 배포 완료!
echo ======================================
echo.
echo 서비스 시작: start_services.bat
echo 서비스 정지: stop_services.bat
echo.
echo 백엔드: http://localhost:5000
echo 프론트엔드: http://localhost:4173
echo.
echo 주의: backend\.env 파일의 SECRET_KEY를 반드시 변경하세요!
echo.
pause
