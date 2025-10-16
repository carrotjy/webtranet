# Webtranet Service Management System

## 프로젝트 개요
산업용 공작기계 설치 및 수리 서비스 관리 시스템입니다. 직원들이 현장에서 작성하는 서비스 리포트를 전산으로 관리하고, 이를 기반으로 거래명세서를 자동 발행할 수 있습니다.

## 기술 스택
- **백엔드**: Flask + SQLite
- **프론트엔드**: React (Tabler 템플릿 기반)
- **인증**: JWT (JSON Web Token)
- **데이터베이스**: SQLite

## 프로젝트 구조
```
backend/
├── app/
│   ├── __init__.py          # Flask 앱 초기화
│   ├── blueprints/          # API 엔드포인트
│   │   ├── auth.py          # 인증 관련
│   │   ├── user_management.py # 사용자 관리
│   │   ├── service_report.py  # 서비스 리포트
│   │   ├── transaction.py     # 거래명세서
│   │   ├── customer.py        # 고객 정보
│   │   └── spare_parts.py     # 스페어파트
│   ├── models/              # 데이터 모델
│   │   └── user.py
│   ├── database/            # 데이터베이스 관련
│   │   ├── init_db.py       # DB 초기화
│   │   └── user.db          # SQLite 데이터베이스
│   └── utils/               # 유틸리티 함수
│       └── auth.py          # 인증 데코레이터
├── .env                     # 환경 변수
├── requirements.txt         # Python 패키지 목록
└── run.py                   # 서버 실행 파일

frontend/                    # React 프론트엔드 (향후 구현)
```

## 주요 기능
1. **사용자 관리**
   - 관리자 계정을 통한 직원 관리
   - 페이지별 접근 권한 설정
   - 비밀번호 변경 및 초기화

2. **서비스 리포트 관리**
   - 현장 서비스 작업 내용 기록
   - 고객 정보, 장비 정보, 작업 내용 관리

3. **거래명세서 관리**
   - 서비스 리포트 기반 자동 거래명세서 생성
   - 부품 사용 내역 포함

4. **고객 정보 관리**
   - 고객사 정보 및 연락처 관리

5. **스페어파트 관리**
   - 부품 재고 관리
   - 가격 및 공급업체 정보

## 설치 및 실행

### 백엔드 설정
1. 가상환경 생성 및 활성화:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

2. 패키지 설치:
```bash
pip install -r requirements.txt
```

3. 데이터베이스 초기화:
```bash
python app/database/init_db.py
```

4. 서버 실행:
```bash
python run.py
```

서버는 http://localhost:5000 에서 실행됩니다.

## API 엔드포인트

### 인증 API
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보
- `POST /api/auth/change-password` - 비밀번호 변경

### 사용자 관리 API (관리자만)
- `GET /api/users/` - 모든 사용자 목록
- `POST /api/users/` - 새 사용자 생성
- `PUT /api/users/<id>` - 사용자 정보 수정
- `DELETE /api/users/<id>` - 사용자 삭제
- `POST /api/users/<id>/reset-password` - 비밀번호 초기화

### 기타 API
- `GET /api/service-reports/` - 서비스 리포트 목록
- `GET /api/transactions/` - 거래명세서 목록
- `GET /api/customers/` - 고객 정보 목록
- `GET /api/spare-parts/` - 스페어파트 목록

## 보안 설정
- JWT 토큰 기반 인증
- 페이지별 접근 권한 제어
- 관리자 전용 기능 분리
- 비밀번호 해싱 (bcrypt)

## 배포 방법

### 빠른 배포 (자동 스크립트)

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
./start_services.sh
```

**Windows:**
```cmd
deploy.bat
start_services.bat
```

### 상세 배포 가이드

자세한 배포 방법은 [DEPLOYMENT.md](DEPLOYMENT.md) 문서를 참고하세요.

배포 옵션:
1. **Git Clone 방식** (권장) - 서버에서 직접 저장소 클론
2. **압축 파일 방식** - Git 없이 압축 파일로 배포
3. **Docker 방식** - Docker Compose 사용 (준비 중)

## 프로덕션 환경

프로덕션 환경에서는 다음을 권장합니다:
- **웹서버**: Nginx
- **WSGI 서버**: Gunicorn (Linux) / Waitress (Windows)
- **프로세스 관리**: Systemd (Linux) / NSSM (Windows)
- **HTTPS**: Let's Encrypt SSL 인증서
- **데이터베이스 백업**: 일일 자동 백업 설정

자세한 내용은 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요.