# 백엔드 서버 시작 가이드

## 방법 1: PowerShell 스크립트 사용
```powershell
cd e:\zData\Webtranet\Webtrarev02\backend
.\start_server.ps1
```

## 방법 2: 수동 실행
```powershell
cd e:\zData\Webtranet\Webtrarev02\backend
.\venv\Scripts\Activate.ps1
python run.py
```

## 방법 3: 가상환경 없이 실행 (패키지 설치 필요)
```powershell
cd e:\zData\Webtranet\Webtrarev02\backend
pip install -r requirements.txt
python run.py
```

## 서버가 정상적으로 시작되면:
- 브라우저에서 `http://localhost:5000` 접속 가능
- 프론트엔드에서 API 호출 가능
- 사용자 관리 기능 정상 작동

## 문제 해결:
1. **ModuleNotFoundError**: `pip install -r requirements.txt` 실행
2. **Port 5000 already in use**: 다른 프로그램이 5000 포트 사용 중
3. **Network Error**: 백엔드 서버가 실행되지 않음

## 현재 상태 확인:
```powershell
# Python 프로세스 확인
Get-Process python

# 포트 5000 사용 확인
netstat -ano | findstr :5000
```