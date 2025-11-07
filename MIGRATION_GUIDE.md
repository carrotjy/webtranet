# Database Migration Guide

## Overview

이 가이드는 YTD Summary 기능 추가를 위한 데이터베이스 마이그레이션 절차를 설명합니다.

## 변경 사항

### invoices 테이블
- **새 컬럼**: `invoice_code_id` (INTEGER, NULLABLE)
- **용도**: 서비스 리포트 없이 직접 생성된 Invoice에 대한 Invoice Code 참조
- **Foreign Key**: `invoice_codes(id)`

## 마이그레이션 방법

### 1. 자동 마이그레이션 (권장)

#### 서버 배포 시
서버 배포 스크립트가 자동으로 마이그레이션을 실행합니다:

```powershell
.\deploy_server.ps1 -backend
```

마이그레이션은 백엔드 배포 중 자동으로 실행됩니다.

#### 로컬 환경
로컬에서 마이그레이션 포함 배포:

```powershell
.\deploy_local_with_migration.ps1
```

### 2. 수동 마이그레이션

마이그레이션만 별도로 실행하려면:

```powershell
python migrate_db.py
```

#### 출력 예시
```
============================================================
Database Migration Script
============================================================
대상 데이터베이스: backend/app/database/user.db
실행 시간: 2025-01-07 12:00:00
============================================================

1. 데이터베이스 백업 중...
✓ 백업 생성 완료: backend/app/database/user.db.backup_20250107_120000

2. 데이터베이스 연결 중...
✓ 데이터베이스 연결 성공

3. 마이그레이션 실행 중...
=== invoices 테이블 마이그레이션 시작 ===
✓ invoice_code_id 컬럼이 성공적으로 추가되었습니다.

4. 마이그레이션 검증 중...
=== 마이그레이션 검증 ===
invoices 테이블 컬럼 목록:
  - id (INTEGER) [PRIMARY KEY]
  - service_report_id (INTEGER)
  - invoice_number (TEXT)
  - customer_id (INTEGER)
  ...
  - invoice_code_id (INTEGER)

✓ 마이그레이션이 성공적으로 완료되었습니다.

최근 Invoice 데이터 샘플:
  ID: 79, Invoice#: I-2024-079, CodeID: 14, ReportID: None

============================================================
✓ 모든 마이그레이션이 성공적으로 완료되었습니다!
============================================================
```

### 3. SQLite 명령어로 직접 실행

데이터베이스에 직접 접속하여 실행:

```bash
sqlite3 backend/app/database/user.db

# 백업 생성
.backup user.db.backup

# 컬럼 추가
ALTER TABLE invoices ADD COLUMN invoice_code_id INTEGER REFERENCES invoice_codes(id);

# 확인
PRAGMA table_info(invoices);

# 종료
.exit
```

## 마이그레이션 확인

### 1. 컬럼 존재 확인

```sql
PRAGMA table_info(invoices);
```

`invoice_code_id` 컬럼이 표시되어야 합니다.

### 2. 데이터 확인

```sql
SELECT id, invoice_number, invoice_code_id, service_report_id
FROM invoices
ORDER BY id DESC
LIMIT 10;
```

### 3. API 테스트

YTD Summary API 호출:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/invoices/ytd-summary?year=2024"
```

## 롤백 방법

마이그레이션 실패 시 백업에서 복원:

```powershell
# 백업 파일 찾기
Get-ChildItem backend\app\database\*.backup_* | Sort-Object LastWriteTime -Descending

# 복원 (가장 최근 백업)
Copy-Item "backend\app\database\user.db.backup_YYYYMMDD_HHMMSS" "backend\app\database\user.db" -Force
```

## 주의 사항

1. **백업**: 마이그레이션 전 자동으로 백업이 생성됩니다
2. **서비스 중단**: 서버 배포 시 백엔드 서비스가 잠시 중단됩니다
3. **캐시 삭제**: 프론트엔드 배포 후 브라우저 캐시를 삭제하세요 (Ctrl+Shift+R)

## 트러블슈팅

### 문제: "invoice_code_id 컬럼이 이미 존재합니다"

**원인**: 마이그레이션이 이미 실행됨

**해결**: 정상 상태이므로 무시하고 계속 진행

### 문제: "데이터베이스 파일을 찾을 수 없습니다"

**원인**: 잘못된 경로에서 실행

**해결**: 프로젝트 루트 디렉토리에서 실행

```powershell
cd E:\zData\Webtranet\Webtrarev02
python migrate_db.py
```

### 문제: "백업 생성에 실패했습니다"

**원인**: 파일 권한 또는 디스크 공간 부족

**해결**:
1. 파일 권한 확인
2. 디스크 공간 확인
3. 수동 백업 생성 후 계속 진행

### 문제: YTD Summary에 데이터가 표시되지 않음

**원인 1**: Invoice Code가 설정되지 않은 Invoice들

**해결**: Invoice 수정 페이지에서 Invoice Code 설정

**원인 2**: Service Report에 Invoice Code가 없음

**해결**: Service Report에 Invoice Code 설정

## 관련 파일

- `migrate_db.py` - 마이그레이션 스크립트
- `deploy_server.ps1` - 서버 배포 스크립트 (마이그레이션 포함)
- `deploy_local_with_migration.ps1` - 로컬 배포 스크립트 (마이그레이션 포함)
- `backend/app/blueprints/invoice.py` - YTD Summary API
- `frontend/src/components/YTDSummaryCard.tsx` - YTD Summary UI

## 변경 이력

- **2025-01-07**: Initial migration for YTD Summary feature
  - Added `invoice_code_id` column to `invoices` table
