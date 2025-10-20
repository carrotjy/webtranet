# Nginx 설정 가이드 (LVD Korea 서버)

## 1. Nginx 설치

```bash
sudo apt update
sudo apt install nginx
```

## 2. Nginx 설정 파일 복사

```bash
cd /home/lvdkorea/webtranet

# 설정 파일 복사
sudo cp nginx-webtranet.conf /etc/nginx/sites-available/webtranet

# 심볼릭 링크 생성 (활성화)
sudo ln -s /etc/nginx/sites-available/webtranet /etc/nginx/sites-enabled/webtranet

# 기본 설정 파일 비활성화 (선택사항)
sudo rm /etc/nginx/sites-enabled/default
```

## 3. 설정 파일 테스트

```bash
# Nginx 설정 파일 문법 검사
sudo nginx -t
```

정상이면 다음과 같이 표시됩니다:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## 4. Nginx 시작

```bash
# Nginx 재시작
sudo systemctl restart nginx

# Nginx 상태 확인
sudo systemctl status nginx

# 부팅 시 자동 시작 설정
sudo systemctl enable nginx
```

## 5. 방화벽 설정 (필요한 경우)

```bash
# 80 포트 열기
sudo ufw allow 'Nginx HTTP'

# 또는
sudo ufw allow 80/tcp

# 방화벽 상태 확인
sudo ufw status
```

## 6. 접속 확인

웹 브라우저에서 접속:
```
http://서버IP주소
```

또는 서버에서 직접:
```bash
curl http://localhost
```

## 7. 로그 확인

```bash
# 실시간 액세스 로그
sudo tail -f /var/log/nginx/webtranet_access.log

# 실시간 에러 로그
sudo tail -f /var/log/nginx/webtranet_error.log

# 전체 Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

## 8. 프론트엔드 업데이트 시

```bash
cd /home/lvdkorea/webtranet/frontend

# 최신 코드 받기
git pull origin main

# 패키지 설치 (package.json 변경 시)
npm install

# 프로덕션 빌드
npm run build

# Nginx는 자동으로 새 파일 서빙 (재시작 불필요)
```

## 9. 백엔드 업데이트 시

```bash
cd /home/lvdkorea/webtranet

# 최신 코드 받기
git pull origin main

# 백엔드 패키지 설치 (requirements.txt 변경 시)
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 백엔드 서비스 재시작
sudo systemctl restart webtranet

# 상태 확인
sudo systemctl status webtranet
```

## 10. 문제 해결

### Nginx가 시작되지 않는 경우

```bash
# 상세 에러 로그 확인
sudo journalctl -xe -u nginx

# 설정 파일 문법 검사
sudo nginx -t

# 포트 충돌 확인
sudo lsof -i :80
```

### 502 Bad Gateway 에러

백엔드 서버가 실행 중인지 확인:
```bash
sudo systemctl status webtranet
sudo lsof -i :5000
```

백엔드 로그 확인:
```bash
sudo journalctl -u webtranet -f
```

### 403 Forbidden 에러

파일 권한 확인:
```bash
# Nginx 사용자 확인 (보통 www-data)
ps aux | grep nginx

# 프론트엔드 빌드 디렉토리 권한
ls -la /home/lvdkorea/webtranet/frontend/build

# 필요시 권한 조정
sudo chmod 755 /home/lvdkorea/webtranet/frontend/build
sudo chmod 644 /home/lvdkorea/webtranet/frontend/build/index.html
```

### 정적 파일이 업데이트되지 않는 경우

브라우저 캐시 삭제 또는:
```bash
# Nginx 캐시 삭제 (캐시 사용 시)
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx
```

## 11. SSL/HTTPS 설정 (선택사항)

Let's Encrypt를 사용한 무료 SSL 인증서:

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# SSL 인증서 발급 (도메인이 있는 경우)
sudo certbot --nginx -d your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## 12. 성능 모니터링

```bash
# Nginx 상태 확인
curl http://localhost/nginx_status

# 접속자 수 확인
sudo tail -f /var/log/nginx/webtranet_access.log | grep -c "GET"

# 에러 발생 추이
sudo tail -f /var/log/nginx/webtranet_error.log
```

## 완료!

이제 다음과 같이 동작합니다:

- **http://서버IP/** → React 프론트엔드
- **http://서버IP/api/** → Flask 백엔드 API
- **백엔드**: Gunicorn (포트 5000) - systemd 관리
- **프론트엔드**: Nginx (포트 80) - 정적 파일 서빙
- **서버 재부팅 시**: 모두 자동으로 시작
