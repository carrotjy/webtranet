# Webtranet 배포 가이드

## 배포 방법

이 프로젝트는 두 가지 방법으로 배포할 수 있습니다:

### 방법 1: 서버에서 직접 Git Clone (권장)

서버에 직접 Git을 설치하고 저장소를 클론하는 방식입니다.

#### Ubuntu/Linux 서버 배포

1. **서버 접속 및 필수 패키지 설치**
```bash
# Git 설치
sudo apt update
sudo apt install -y git python3 python3-pip python3-venv nodejs npm

# LibreOffice 설치 (Excel to PDF 변환용)
sudo apt install -y libreoffice
```

2. **프로젝트 클론**
```bash
cd /var/www  # 또는 원하는 디렉토리
git clone https://github.com/carrotjy/webtranet.git
cd webtranet
```

3. **백엔드 설정**
```bash
cd backend

# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt
pip install -r requirements_pdf.txt  # PDF 생성 관련 패키지

# 데이터베이스 초기화
python app/database/init_db.py

# .env 파일 생성 (SECRET_KEY 설정)
echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" > .env
echo "JWT_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" >> .env
```

4. **프론트엔드 빌드**
```bash
cd ../frontend

# 패키지 설치
npm install

# 프로덕션 빌드
npm run build
```

5. **백엔드 서버 실행**
```bash
cd ../backend

# 개발 서버 실행 (테스트용)
python run.py

# 프로덕션 서버 실행 (Gunicorn 사용 권장)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

6. **프론트엔드 서버 실행**
```bash
cd ../frontend

# 프로덕션 모드로 실행
npm run preview

# 또는 Nginx로 빌드된 정적 파일 서빙 (권장)
# build/ 디렉토리를 Nginx의 root로 설정
```

#### Windows 서버 배포

1. **필수 프로그램 설치**
- Git: https://git-scm.com/download/win
- Python 3.9+: https://www.python.org/downloads/
- Node.js 18+: https://nodejs.org/
- LibreOffice (선택): https://www.libreoffice.org/download/

2. **프로젝트 클론**
```cmd
cd C:\inetpub\wwwroot  # 또는 원하는 디렉토리
git clone https://github.com/carrotjy/webtranet.git
cd webtranet
```

3. **백엔드 설정**
```cmd
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt
pip install -r requirements_pdf.txt

# 데이터베이스 초기화
python app\database\init_db.py

# .env 파일 생성
echo SECRET_KEY=your-secret-key-here > .env
echo JWT_SECRET_KEY=your-jwt-secret-key-here >> .env
```

4. **프론트엔드 빌드**
```cmd
cd ..\frontend
npm install
npm run build
```

5. **서버 실행**
```cmd
cd ..\backend
python run.py
```

---

### 방법 2: 압축 파일로 배포

Git을 사용할 수 없는 환경에서는 압축 파일로 배포할 수 있습니다.

#### 배포용 압축 파일 생성

1. **불필요한 파일 제외하고 압축**
```bash
# Windows (PowerShell)
Compress-Archive -Path backend,frontend,README.md,DEPLOYMENT.md -DestinationPath webtranet-deploy.zip

# Linux/Mac
tar -czf webtranet-deploy.tar.gz backend/ frontend/ README.md DEPLOYMENT.md \
  --exclude='node_modules' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='.git' \
  --exclude='backend/instance' \
  --exclude='frontend/build' \
  --exclude='frontend/dist'
```

2. **서버에 압축 파일 업로드**
- FTP, SFTP, SCP 등을 사용하여 서버에 업로드

3. **서버에서 압축 해제**
```bash
# Linux
cd /var/www
tar -xzf webtranet-deploy.tar.gz

# Windows
# 우클릭 > 압축 풀기 또는
Expand-Archive -Path webtranet-deploy.zip -DestinationPath .
```

4. **위의 "방법 1"의 3~6단계 진행**

---

## 프로덕션 환경 설정 (Nginx + Gunicorn)

### Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/webtranet
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 도메인 또는 IP 주소

    # 프론트엔드 (정적 파일)
    location / {
        root /var/www/webtranet/frontend/dist;  # 빌드 디렉토리
        try_files $uri $uri/ /index.html;
    }

    # 백엔드 API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Nginx 설정 활성화
sudo ln -s /etc/nginx/sites-available/webtranet /etc/nginx/sites-enabled/
sudo nginx -t  # 설정 테스트
sudo systemctl reload nginx
```

### Systemd 서비스 등록 (자동 시작)

```bash
sudo nano /etc/systemd/system/webtranet.service
```

```ini
[Unit]
Description=Webtranet Backend Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/webtranet/backend
Environment="PATH=/var/www/webtranet/backend/venv/bin"
ExecStart=/var/www/webtranet/backend/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app()"
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 서비스 활성화 및 시작
sudo systemctl daemon-reload
sudo systemctl enable webtranet
sudo systemctl start webtranet
sudo systemctl status webtranet
```

---

## 환경 변수 설정

**backend/.env 파일에 다음 내용 추가:**

```env
# 보안 키 (랜덤 문자열 생성 권장)
SECRET_KEY=your-super-secret-key-here-change-this-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-this-in-production

# 데이터베이스 경로 (선택)
DATABASE_PATH=instance/database.db

# Flask 환경
FLASK_ENV=production
```

**frontend/.env 파일에 다음 내용 추가:**

```env
# API 서버 주소
VITE_API_BASE_URL=http://your-server-ip:5000

# 또는 프로덕션 도메인
# VITE_API_BASE_URL=https://api.your-domain.com
```

---

## 데이터베이스 백업

정기적으로 데이터베이스를 백업하세요:

```bash
# 백업 디렉토리 생성
mkdir -p /var/backups/webtranet

# 백업 스크립트
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/webtranet/backend/instance/database.db \
   /var/backups/webtranet/database_$DATE.db

# 7일 이상 된 백업 삭제
find /var/backups/webtranet -name "database_*.db" -mtime +7 -delete
```

Cron으로 자동 백업 설정:
```bash
crontab -e
# 매일 새벽 2시에 백업
0 2 * * * /var/www/webtranet/backup.sh
```

---

## 보안 체크리스트

- [ ] .env 파일의 SECRET_KEY와 JWT_SECRET_KEY 변경
- [ ] 관리자 계정의 기본 비밀번호 변경
- [ ] 방화벽 설정 (필요한 포트만 열기)
- [ ] HTTPS 설정 (Let's Encrypt 사용 권장)
- [ ] 데이터베이스 정기 백업 설정
- [ ] 로그 파일 모니터링 설정
- [ ] CORS 설정 확인 (프로덕션 도메인만 허용)

---

## 업데이트 방법

### Git을 사용하는 경우

```bash
cd /var/www/webtranet

# 최신 코드 가져오기
git pull origin main

# 백엔드 업데이트
cd backend
source venv/bin/activate
pip install -r requirements.txt
python app/database/init_db.py  # 마이그레이션 적용

# 프론트엔드 업데이트
cd ../frontend
npm install
npm run build

# 서버 재시작
sudo systemctl restart webtranet
```

### 압축 파일을 사용하는 경우

1. 현재 데이터베이스와 업로드 파일 백업
2. 새 압축 파일로 교체
3. 백업한 데이터베이스와 파일 복원
4. 서버 재시작

---

## 문제 해결

### 로그 확인

```bash
# Systemd 서비스 로그
sudo journalctl -u webtranet -f

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Flask 앱 로그
tail -f /var/www/webtranet/backend/app.log
```

### 포트 충돌

```bash
# 포트 사용 확인
sudo netstat -tulpn | grep :5000

# 프로세스 종료
sudo kill -9 <PID>
```

### 권한 문제

```bash
# 파일 소유권 변경
sudo chown -R www-data:www-data /var/www/webtranet

# 실행 권한 부여
chmod +x /var/www/webtranet/backend/run.py
```

---

## 지원 및 문서

- GitHub: https://github.com/carrotjy/webtranet
- 이슈 리포팅: https://github.com/carrotjy/webtranet/issues
