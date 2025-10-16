# Webtranet API 테스트 가이드

## 기본 설정
- 서버 주소: http://localhost:5000
- Content-Type: application/json

## 1. 로그인 테스트

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

## 2. 사용자 정보 조회
```bash
GET http://localhost:5000/api/auth/me
Authorization: Bearer {access_token}
```

## 3. 사용자 관리 (관리자만)

### 모든 사용자 목록
```bash
GET http://localhost:5000/api/users/
Authorization: Bearer {admin_access_token}
```

### 새 사용자 생성
```bash
POST http://localhost:5000/api/users/
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "name": "새 사용자",
  "email": "newuser@webtranet.com",
  "password": "newpassword123",
  "contact": "010-1111-2222",
  "department": "기술부",
  "service_report_access": true,
  "customer_access": true,
  "spare_parts_access": false,
  "transaction_access": false,
  "is_admin": false
}
```

### 사용자 정보 수정
```bash
PUT http://localhost:5000/api/users/2
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "name": "수정된 이름",
  "service_report_access": true,
  "transaction_access": true
}
```

## 4. 페이지별 접근 테스트

### 서비스 리포트 페이지
```bash
GET http://localhost:5000/api/service-reports/
Authorization: Bearer {access_token}
```

### 거래명세서 페이지
```bash
GET http://localhost:5000/api/transactions/
Authorization: Bearer {access_token}
```

### 고객정보 페이지
```bash
GET http://localhost:5000/api/customers/
Authorization: Bearer {access_token}
```

### 스페어파트 페이지
```bash
GET http://localhost:5000/api/spare-parts/
Authorization: Bearer {access_token}
```

## 5. 비밀번호 변경
```bash
POST http://localhost:5000/api/auth/change-password
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "current_password": "admin",
  "new_password": "newpassword123"
}
```

## 6. 사용자 비밀번호 초기화 (관리자만)
```bash
POST http://localhost:5000/api/users/2/reset-password
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "new_password": "resetpassword123"
}
```

## 응답 예시

### 성공적인 로그인
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "name": "관리자",
    "email": "admin@webtranet.com",
    "contact": "02-1234-5678",
    "department": "관리부",
    "service_report_access": true,
    "transaction_access": true,
    "customer_access": true,
    "spare_parts_access": true,
    "is_admin": true
  }
}
```

### 권한 없음 오류
```json
{
  "error": "service_report 페이지에 접근할 권한이 없습니다."
}
```

### 로그인 실패
```json
{
  "error": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```