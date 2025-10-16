# LibreOffice 설치 가이드

거래명세서 PDF 변환 기능을 위해 LibreOffice가 필요합니다.

## 우분투/데비안 (Ubuntu/Debian)

```bash
# LibreOffice 설치
sudo apt-get update
sudo apt-get install -y libreoffice

# 헤드리스 모드 테스트
libreoffice --headless --version
```

## CentOS/RHEL

```bash
# LibreOffice 설치
sudo yum install -y libreoffice

# 또는
sudo dnf install -y libreoffice

# 헤드리스 모드 테스트
libreoffice --headless --version
```

## Windows (개발 환경)

1. LibreOffice 다운로드: https://www.libreoffice.org/download/download/
2. 설치 후 다음 경로 중 하나에 설치되었는지 확인:
   - `C:\Program Files\LibreOffice\program\soffice.exe`
   - `C:\Program Files (x86)\LibreOffice\program\soffice.exe`

## 설치 확인

```bash
# Linux/Mac
libreoffice --headless --convert-to pdf --outdir /tmp test.xlsx

# Windows
"C:\Program Files\LibreOffice\program\soffice.exe" --headless --convert-to pdf --outdir C:\temp test.xlsx
```

## PDF 변환 동작 방식

1. `openpyxl`로 Excel 파일 생성 (템플릿 기반)
2. LibreOffice headless 모드로 Excel → PDF 변환
3. PDF 파일을 브라우저에서 열기

## LibreOffice가 없는 경우

- Excel 파일만 생성되어 다운로드됩니다
- 사용자가 로컬에서 Excel/LibreOffice로 열어서 PDF로 저장할 수 있습니다

## 장점

✅ 무료, 오픈소스
✅ Windows/Linux/Mac 모두 지원
✅ Microsoft Excel 설치 불필요
✅ Excel 서식 완벽 유지
✅ 헤드리스 모드로 서버 환경에서 안정적으로 작동
✅ 라이선스 비용 없음

## 주의사항

- 서버에서 처음 실행 시 초기화에 시간이 걸릴 수 있습니다 (약 2-3초)
- 동시 다중 변환 시 프로세스 관리 필요 (현재는 30초 타임아웃 설정)
- 메모리: 변환당 약 100-200MB 필요
