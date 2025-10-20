# 우분투 서버 배포 가이드

## 방법 1: 간단한 스크립트 사용 (개발/테스트)

### 1-1. 실행 권한 부여
```bash
cd /home/webtranet/webtranet/backend
chmod +x start.sh
```

### 1-2. 실행
```bash
./start.sh
```

---

## 방법 2: Systemd 서비스 (기본 프로덕션)

### 2-1. 서비스 파일 복사
```bash
sudo cp webtranet.service /etc/systemd/system/
```

### 2-2. 서비스 활성화 및 시작
```bash
sudo systemctl daemon-reload
sudo systemctl enable webtranet.service
sudo systemctl start webtranet.service
```

### 2-3. 서비스 관리 명령어
```bash
# 상태 확인
sudo systemctl status webtranet

# 시작
sudo systemctl start webtranet

# 중지
sudo systemctl stop webtranet

# 재시작
sudo systemctl restart webtranet

# 로그 확인
sudo journalctl -u webtranet -f
```

---

## 방법 3: Gunicorn + Systemd (권장 프로덕션)

### 3-1. Gunicorn 설치
```bash
source venv/bin/activate
pip install gunicorn
```

### 3-2. 로그 디렉토리 생성
```bash
mkdir -p /home/webtranet/webtranet/backend/logs
```

### 3-3. 서비스 파일 복사
```bash
sudo cp webtranet-gunicorn.service /etc/systemd/system/
```

### 3-4. 서비스 활성화 및 시작
```bash
sudo systemctl daemon-reload
sudo systemctl enable webtranet-gunicorn.service
sudo systemctl start webtranet-gunicorn.service
```

### 3-5. 서비스 관리 명령어
```bash
# 상태 확인
sudo systemctl status webtranet-gunicorn

# 시작
sudo systemctl start webtranet-gunicorn

# 중지
sudo systemctl stop webtranet-gunicorn

# 재시작 (코드 변경 후)
sudo systemctl restart webtranet-gunicorn

# 로그 확인 (systemd)
sudo journalctl -u webtranet-gunicorn -f

# 로그 확인 (gunicorn)
tail -f logs/gunicorn_access.log
tail -f logs/gunicorn_error.log
```

---

## 방법 4: Nginx + Gunicorn (완전한 프로덕션)

### 4-1. Nginx 설치
```bash
sudo apt update
sudo apt install nginx
```

### 4-2. Nginx 설정
```bash
sudo nano /etc/nginx/sites-available/webtranet
```

다음 내용 입력:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 또는 서버 IP

    # 정적 파일 (React 빌드)
    location / {
        root /home/webtranet/webtranet/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API 프록시
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4-3. Nginx 활성화
```bash
sudo ln -s /etc/nginx/sites-available/webtranet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 추천 방법 선택 가이드

| 환경 | 추천 방법 | 이유 |
|------|-----------|------|
| 개발/테스트 | 방법 1 (start.sh) | 간단하고 빠름 |
| 기본 프로덕션 | 방법 2 (Systemd) | 자동 시작/재시작 |
| 프로덕션 | 방법 3 (Gunicorn) | 성능, 안정성 |
| 완전한 프로덕션 | 방법 4 (Nginx+Gunicorn) | 정적 파일, 로드밸런싱 |

---

## 자동 시작 설정 후 장점

1. **서버 재부팅 시 자동 시작**: systemd가 자동으로 앱을 시작
2. **크래시 자동 복구**: 앱이 죽으면 자동으로 재시작
3. **간단한 관리**: `systemctl` 명령어로 쉽게 관리
4. **로그 관리**: journalctl로 통합 로그 확인

---

## 코드 업데이트 후

```bash
cd /home/webtranet/webtranet
git pull origin main

# Systemd 사용 시
sudo systemctl restart webtranet-gunicorn

# 또는 start.sh 사용 시
# Ctrl+C로 종료 후 다시 ./start.sh
```

---

## 문제 해결

### 포트 이미 사용 중
```bash
# 5000 포트 사용 프로세스 확인
sudo lsof -i :5000

# 프로세스 종료
sudo kill -9 <PID>
```

### 권한 문제
```bash
# venv 소유자 변경
sudo chown -R webtranet:webtranet /home/webtranet/webtranet/backend/venv

# 로그 디렉토리 권한
sudo chown -R webtranet:webtranet /home/webtranet/webtranet/backend/logs
```

### 서비스 로그 확인
```bash
# 최근 100줄
sudo journalctl -u webtranet-gunicorn -n 100

# 실시간 로그
sudo journalctl -u webtranet-gunicorn -f

# 오늘 로그
sudo journalctl -u webtranet-gunicorn --since today
```
