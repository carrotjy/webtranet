# 서버 배포 및 트러블슈팅 가이드

## 배포 프로세스

### 1. 서버 배포 실행
```powershell
# 전체 배포 (프론트엔드 + 백엔드)
.\deploy_server.ps1

# 프론트엔드만 배포
.\deploy_server.ps1 -frontend

# 백엔드만 배포
.\deploy_server.ps1 -backend

# Git pull 건너뛰기 (로컬 변경사항 테스트 시)
.\deploy_server.ps1 -skipGit
```

### 2. 배포 과정
1. **Git 동기화**: 최신 코드를 pull
2. **프론트엔드 빌드**: React 앱을 production 모드로 빌드
3. **IIS 배포**: 빌드된 파일을 `C:\inetpub\wwwroot\webtranet`로 복사
4. **백엔드 재시작**: Python 가상환경 업데이트 및 Windows 서비스 재시작

## 브라우저 캐시 문제 해결

배포 후 UI가 업데이트되지 않는 경우:

### 방법 1: 하드 새로고침
- **Windows/Linux**: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### 방법 2: 캐시 완전 삭제
1. `Ctrl + Shift + Delete` (브라우저 설정 열기)
2. "캐시된 이미지 및 파일" 선택
3. 삭제 실행

### 방법 3: 시크릿/비공개 모드
- **Chrome**: `Ctrl + Shift + N`
- **Edge**: `Ctrl + Shift + P`
- **Firefox**: `Ctrl + Shift + P`

### 방법 4: 개발자 도구에서 캐시 비활성화
1. `F12` (개발자 도구 열기)
2. Network 탭 선택
3. "Disable cache" 체크박스 활성화

## 환경별 설정

### 개발 환경 (localhost)
- `.env.development` 파일 사용
- API URL: `http://localhost:5000`
- 실행: `npm start`

### 프로덕션 환경 (서버)
- `.env.production` 파일 사용
- API URL: 상대 경로 (Nginx가 /api로 프록시)
- 빌드: `npm run build`

## 백엔드 의존성

### requirements.txt 주요 패키지
```
Flask==2.3.3              # 웹 프레임워크
Flask-CORS==4.0.0         # CORS 처리
Flask-JWT-Extended==4.5.3 # JWT 인증
Flask-SQLAlchemy==3.0.5   # 데이터베이스 ORM
bcrypt==4.0.1             # 비밀번호 해싱
pandas==2.2.0             # 데이터 처리
openpyxl==3.1.2           # Excel 파일 처리
pywin32==306              # Windows API (팩스 전송 등)
```

## 일반적인 문제 해결

### 1. PDF 생성 안 됨
**원인**: 백엔드 오류 또는 파일 경로 문제
**해결**:
```powershell
# 백엔드 로그 확인
Get-Service "Webtranet Backend" | Select-Object -Property *

# 수동 재시작
.\deploy_server.ps1 -backend
```

### 2. 팩스 전송 실패
**원인**: pywin32 미설치 또는 팩스 프린터 설정 오류
**해결**:
```powershell
# pywin32 설치 확인
cd backend
.\venv\Scripts\pip.exe list | Select-String pywin32

# 재설치
.\venv\Scripts\pip.exe install pywin32==306
```

### 3. API 연결 오류 (프로덕션)
**원인**: Nginx 프록시 설정 또는 백엔드 서비스 중단
**확인**:
1. 백엔드 서비스 상태 확인
2. Nginx 설정 확인 (`nginx-webtranet.conf`)
3. 방화벽 설정 확인

### 4. 빌드 파일이 반영 안 됨
**원인**: 빌드는 성공했지만 IIS 복사 실패 또는 브라우저 캐시
**확인**:
```powershell
# IIS 경로에 최신 파일 확인
Get-ChildItem "C:\inetpub\wwwroot\webtranet" | Sort-Object LastWriteTime -Descending | Select-Object -First 5

# 빌드 시간과 IIS 파일 시간 비교
$buildTime = (Get-Item ".\frontend\build\index.html").LastWriteTime
$iisTime = (Get-Item "C:\inetpub\wwwroot\webtranet\index.html").LastWriteTime
Write-Host "Build: $buildTime, IIS: $iisTime"
```

## 권한 관련 이슈

### 새로운 권한이 UI에 반영 안 됨
1. 백엔드 데이터베이스 마이그레이션 확인:
```powershell
cd backend
.\venv\Scripts\python.exe add_transaction_and_stock_permissions.py
```

2. 사용자 데이터 새로고침:
   - 로그아웃 후 재로그인
   - 또는 관리자 메뉴에서 사용자 권한 재설정

## 배포 체크리스트

배포 전:
- [ ] Git 커밋 및 푸시 완료
- [ ] 로컬 테스트 완료
- [ ] 데이터베이스 마이그레이션 스크립트 준비
- [ ] requirements.txt 업데이트 확인

배포 후:
- [ ] `.\deploy_server.ps1` 실행 성공 확인
- [ ] 백엔드 서비스 실행 상태 확인
- [ ] 브라우저 하드 새로고침 (Ctrl+Shift+R)
- [ ] 주요 기능 테스트 (로그인, PDF 생성, 팩스 전송 등)
- [ ] 에러 로그 확인

## 유용한 명령어

```powershell
# 백엔드 서비스 상태 확인
Get-Service "Webtranet Backend"

# 백엔드 서비스 재시작
Restart-Service "Webtranet Backend"

# 최근 배포된 파일 확인
Get-ChildItem "C:\inetpub\wwwroot\webtranet" -Recurse | 
  Where-Object {$_.LastWriteTime -gt (Get-Date).AddHours(-1)} | 
  Select-Object FullName, LastWriteTime

# IIS 애플리케이션 풀 재시작
Restart-WebAppPool -Name "DefaultAppPool"
```

## 연락처 및 지원

문제가 지속되는 경우:
1. 백엔드 로그 파일 확인
2. 브라우저 개발자 도구 콘솔 확인 (F12)
3. Network 탭에서 API 요청/응답 확인
