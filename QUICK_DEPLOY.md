# 빠른 배포 가이드

## 배포 옵션 선택

### 옵션 1: Git Clone 방식 ⭐ 권장

서버에서 직접 GitHub 저장소를 클론합니다.

**장점:**
- 간단하고 빠름
- 업데이트가 쉬움 (git pull)
- 버전 관리 용이

**단점:**
- 서버에 Git 설치 필요
- GitHub 접근 권한 필요

**실행 방법:**

```bash
# Ubuntu/Linux
ssh user@your-server
cd /var/www
git clone https://github.com/carrotjy/webtranet.git
cd webtranet
chmod +x deploy.sh
./deploy.sh
./start_services.sh
```

```cmd
REM Windows Server
cd C:\inetpub\wwwroot
git clone https://github.com/carrotjy/webtranet.git
cd webtranet
deploy.bat
start_services.bat
```

---

### 옵션 2: 압축 파일 방식

Git을 사용할 수 없는 환경에서 사용합니다.

**장점:**
- Git 불필요
- 간단한 전송

**단점:**
- 수동 업데이트 필요
- 파일 크기가 큼

**압축 파일 생성:**

```bash
# 현재 컴퓨터에서 압축 파일 생성
cd E:\zdata\webtranet\webtrarev02

# Windows (PowerShell)
Compress-Archive -Path backend,frontend,README.md,DEPLOYMENT.md,deploy.bat -DestinationPath webtranet-deploy.zip -Force

# Linux/Mac
tar -czf webtranet-deploy.tar.gz backend/ frontend/ README.md DEPLOYMENT.md deploy.sh \
  --exclude='node_modules' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='.git' \
  --exclude='backend/instance' \
  --exclude='frontend/build' \
  --exclude='frontend/dist'
```

**서버에서 압축 해제 및 배포:**

```bash
# Linux
cd /var/www
# 압축 파일을 서버에 업로드한 후
tar -xzf webtranet-deploy.tar.gz
cd webtranet
chmod +x deploy.sh
./deploy.sh
./start_services.sh
```

```cmd
REM Windows
cd C:\inetpub\wwwroot
REM 압축 파일을 서버에 업로드한 후
REM 우클릭 > 압축 풀기
cd webtranet
deploy.bat
start_services.bat
```

---

## 배포 후 확인사항

### 1. 서비스 접속 확인

- **백엔드**: http://서버IP:5000
- **프론트엔드**: http://서버IP:4173 (또는 3000)

### 2. 환경 변수 확인

`backend/.env` 파일을 열어서 다음을 확인하세요:

```env
SECRET_KEY=반드시-변경하세요-랜덤-문자열
JWT_SECRET_KEY=반드시-변경하세요-랜덤-문자열
FLASK_ENV=production
```

**중요:** 프로덕션 환경에서는 반드시 SECRET_KEY를 변경해야 합니다!

### 3. 관리자 계정 생성

처음 배포 후 관리자 계정을 생성해야 합니다:

```bash
cd backend
source venv/bin/activate  # Linux
# 또는
venv\Scripts\activate  # Windows

python
```

```python
from app.database.init_db import get_db_connection
from werkzeug.security import generate_password_hash

conn = get_db_connection()
conn.execute('''
    INSERT INTO users (username, email, password, name, role)
    VALUES (?, ?, ?, ?, ?)
''', ('admin', 'admin@company.com', generate_password_hash('admin123'), '관리자', 'admin'))
conn.commit()
conn.close()
print("관리자 계정이 생성되었습니다.")
print("로그인: admin@company.com / admin123")
print("로그인 후 반드시 비밀번호를 변경하세요!")
```

---

## 프로덕션 환경 추가 설정

개발 서버가 아닌 실제 서비스용으로 배포하는 경우:

### Nginx 설치 및 설정 (Linux)

```bash
sudo apt install nginx

# Nginx 설정
sudo nano /etc/nginx/sites-available/webtranet
```

설정 파일 내용은 `DEPLOYMENT.md`의 Nginx 설정 섹션 참고

### HTTPS 설정 (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 자동 시작 설정 (Systemd)

```bash
sudo nano /etc/systemd/system/webtranet.service
```

서비스 파일 내용은 `DEPLOYMENT.md`의 Systemd 설정 섹션 참고

---

## 업데이트 방법

### Git Clone 방식

```bash
cd /var/www/webtranet
git pull origin main
./deploy.sh  # 다시 실행
./stop_services.sh
./start_services.sh
```

### 압축 파일 방식

1. 데이터베이스 백업
```bash
cp backend/instance/database.db backend/instance/database.db.backup
```

2. 새 압축 파일로 덮어쓰기
3. 데이터베이스 복원 (필요시)
4. 서비스 재시작

---

## 문제 해결

### 포트가 이미 사용 중

```bash
# Linux
sudo lsof -i :5000
sudo kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### 데이터베이스 오류

```bash
cd backend
rm -rf instance/database.db  # 주의: 모든 데이터 삭제됨
python app/database/init_db.py
```

### 패키지 설치 오류

```bash
cd backend
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

---

## 지원

- 📖 상세 문서: [DEPLOYMENT.md](DEPLOYMENT.md)
- 🐛 이슈 리포팅: https://github.com/carrotjy/webtranet/issues
- 📧 문의: GitHub Issues로 문의해주세요

---

## 체크리스트

배포 전 확인:
- [ ] Python 3.9+ 설치
- [ ] Node.js 18+ 설치
- [ ] Git 설치 (옵션 1 선택 시)
- [ ] 서버 방화벽 포트 열기 (5000, 4173)

배포 후 확인:
- [ ] 백엔드 서비스 실행 확인
- [ ] 프론트엔드 서비스 실행 확인
- [ ] .env 파일 SECRET_KEY 변경
- [ ] 관리자 계정 생성
- [ ] 로그인 테스트
- [ ] 데이터베이스 백업 설정
- [ ] HTTPS 설정 (프로덕션)

완료! 🎉
