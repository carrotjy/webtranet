# LVD Korea 서버 프로덕션 설정 가이드

## 1. Gunicorn 설치

```bash
cd /home/lvdkorea/webtranet/backend
source venv/bin/activate
pip install gunicorn
```

## 2. 로그 디렉토리 생성

```bash
mkdir -p /home/lvdkorea/webtranet/backend/logs
```

## 3. 직접 실행으로 테스트

```bash
cd /home/lvdkorea/webtranet/backend
source venv/bin/activate
gunicorn --config gunicorn.conf.py run:app
```

서버가 정상적으로 시작되면 `Ctrl+C`로 종료하고 다음 단계로 진행합니다.

## 4. Systemd 서비스 설정 (자동 시작)

### 4-1. 서비스 파일 복사

```bash
sudo cp /home/lvdkorea/webtranet/backend/webtranet-gunicorn-lvdkorea.service /etc/systemd/system/webtranet.service
```

### 4-2. 서비스 활성화 및 시작

```bash
sudo systemctl daemon-reload
sudo systemctl enable webtranet
sudo systemctl start webtranet
```

### 4-3. 서비스 상태 확인

```bash
sudo systemctl status webtranet
```

정상적으로 실행 중이면 다음과 같이 표시됩니다:
```
● webtranet.service - Webtranet Flask Backend with Gunicorn (LVD Korea)
     Loaded: loaded (/etc/systemd/system/webtranet.service; enabled)
     Active: active (running) since...
```

## 5. 서비스 관리 명령어

```bash
# 시작
sudo systemctl start webtranet

# 중지
sudo systemctl stop webtranet

# 재시작 (코드 변경 후)
sudo systemctl restart webtranet

# 상태 확인
sudo systemctl status webtranet

# 로그 확인 (실시간)
sudo journalctl -u webtranet -f

# 로그 확인 (최근 100줄)
sudo journalctl -u webtranet -n 100

# Gunicorn 로그 확인
tail -f /home/lvdkorea/webtranet/backend/logs/gunicorn_access.log
tail -f /home/lvdkorea/webtranet/backend/logs/gunicorn_error.log
```

## 6. 코드 업데이트 후

```bash
cd /home/lvdkorea/webtranet
git pull origin main

# 패키지 업데이트가 있는 경우
cd backend
source venv/bin/activate
pip install -r requirements.txt

# 서비스 재시작
sudo systemctl restart webtranet

# 상태 확인
sudo systemctl status webtranet
```

## 7. 문제 해결

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
sudo chown -R jhi:jhi /home/lvdkorea/webtranet/backend/venv

# 로그 디렉토리 권한
sudo chown -R jhi:jhi /home/lvdkorea/webtranet/backend/logs
```

### 서비스가 시작되지 않는 경우

```bash
# 상세 로그 확인
sudo journalctl -u webtranet -xe

# Gunicorn 직접 실행으로 에러 확인
cd /home/lvdkorea/webtranet/backend
source venv/bin/activate
gunicorn --config gunicorn.conf.py run:app
```

## 8. 성능 모니터링

```bash
# 실시간 요청 로그
tail -f logs/gunicorn_access.log

# 에러 로그
tail -f logs/gunicorn_error.log

# 프로세스 상태
ps aux | grep gunicorn

# 메모리 사용량
sudo systemctl status webtranet
```

## 9. 개발 vs 프로덕션

| 항목 | 개발 (start.sh) | 프로덕션 (Gunicorn) |
|------|----------------|-------------------|
| 서버 | Flask dev server | Gunicorn |
| 워커 수 | 1 | CPU * 2 + 1 |
| 자동 재시작 | ❌ | ✅ (Systemd) |
| 로그 관리 | 콘솔만 | 파일 + Systemd |
| 성능 | 낮음 | 높음 |
| 사용 목적 | 테스트 | 실제 서비스 |

**중요**: 프로덕션 서버에서는 반드시 Gunicorn + Systemd를 사용하세요!
