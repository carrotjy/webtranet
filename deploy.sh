#!/bin/bash

# Webtranet 자동 배포 스크립트 (Linux/Mac)

echo "======================================"
echo "Webtranet 배포 스크립트"
echo "======================================"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 백엔드 설정
echo -e "\n${GREEN}[1/5] 백엔드 설정 중...${NC}"
cd backend

# 가상환경 생성
if [ ! -d "venv" ]; then
    echo "가상환경 생성 중..."
    python3 -m venv venv
fi

# 가상환경 활성화
source venv/bin/activate

# 패키지 설치
echo "패키지 설치 중..."
pip install -r requirements.txt
pip install -r requirements_pdf.txt

# .env 파일 생성 (없는 경우)
if [ ! -f ".env" ]; then
    echo "환경 변수 파일 생성 중..."
    SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
    JWT_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')

    cat > .env << EOF
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_KEY
FLASK_ENV=production
EOF
    echo -e "${GREEN}.env 파일이 생성되었습니다.${NC}"
else
    echo -e "${GREEN}.env 파일이 이미 존재합니다.${NC}"
fi

# 데이터베이스 초기화/마이그레이션
echo "데이터베이스 초기화 중..."
python app/database/init_db.py

cd ..

# 2. 프론트엔드 설정
echo -e "\n${GREEN}[2/5] 프론트엔드 설정 중...${NC}"
cd frontend

# Node 패키지 설치
if [ ! -d "node_modules" ]; then
    echo "Node 패키지 설치 중..."
    npm install
fi

# 프로덕션 빌드
echo "프론트엔드 빌드 중..."
npm run build

cd ..

# 3. Gunicorn 설치 확인
echo -e "\n${GREEN}[3/5] Gunicorn 설치 확인 중...${NC}"
cd backend
source venv/bin/activate
pip install gunicorn
cd ..

# 4. 서비스 시작 스크립트 생성
echo -e "\n${GREEN}[4/5] 서비스 시작 스크립트 생성 중...${NC}"
cat > start_services.sh << 'EOF'
#!/bin/bash

# 백엔드 시작
cd backend
source venv/bin/activate
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()" --daemon --pid gunicorn.pid
echo "백엔드 서버가 시작되었습니다 (포트 5000)"

# 프론트엔드 시작 (옵션 - Nginx 사용 시 불필요)
cd ../frontend
npm run preview &
echo $! > frontend.pid
echo "프론트엔드 서버가 시작되었습니다 (포트 4173)"

cd ..
echo "모든 서비스가 시작되었습니다."
EOF

chmod +x start_services.sh

# 5. 정지 스크립트 생성
cat > stop_services.sh << 'EOF'
#!/bin/bash

# 백엔드 정지
if [ -f backend/gunicorn.pid ]; then
    kill $(cat backend/gunicorn.pid)
    rm backend/gunicorn.pid
    echo "백엔드 서버가 정지되었습니다."
fi

# 프론트엔드 정지
if [ -f frontend/frontend.pid ]; then
    kill $(cat frontend/frontend.pid)
    rm frontend/frontend.pid
    echo "프론트엔드 서버가 정지되었습니다."
fi

echo "모든 서비스가 정지되었습니다."
EOF

chmod +x stop_services.sh

# 완료
echo -e "\n${GREEN}======================================"
echo "배포 완료!"
echo "======================================${NC}"
echo ""
echo "서비스 시작: ./start_services.sh"
echo "서비스 정지: ./stop_services.sh"
echo ""
echo "백엔드: http://localhost:5000"
echo "프론트엔드: http://localhost:4173"
echo ""
echo -e "${RED}주의: 프로덕션 환경에서는 Nginx + Systemd 사용을 권장합니다.${NC}"
echo "자세한 내용은 DEPLOYMENT.md를 참고하세요."
