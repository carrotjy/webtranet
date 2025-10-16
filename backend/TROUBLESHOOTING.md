# 백엔드 에러 트러블슈팅

## 가능한 에러들과 해결 방법

### 1. ModuleNotFoundError: No module named 'weasyprint'

**원인**: WeasyPrint가 설치되지 않음

**해결**:
```bash
cd backend
.\venv\Scripts\Activate.ps1
pip install weasyprint jinja2
```

또는 requirements 파일 사용:
```bash
pip install -r requirements_pdf.txt
```

**참고**: WeasyPrint가 없어도 Excel 파일은 정상 생성됩니다. PDF만 생성되지 않습니다.

---

### 2. ImportError: cannot import name 'Environment' from 'jinja2'

**원인**: Jinja2 버전 문제

**해결**:
```bash
pip install --upgrade jinja2
```

---

### 3. TemplateNotFound: invoice_template.html

**원인**: 템플릿 파일 경로 문제

**확인**:
```bash
# 파일이 있는지 확인
ls app/templates/invoice_template.html
```

**해결**: 파일이 없으면 다시 생성하거나, 경로 확인

---

### 4. OSError: cannot load library 'gobject-2.0-0'

**원인**: WeasyPrint의 GTK 의존성 문제 (Windows)

**해결**:
```bash
# Windows에서 GTK 설치
# 1. GTK3 Runtime 다운로드 및 설치
# https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer

# 또는 conda 사용
conda install -c conda-forge weasyprint
```

**대안**: WeasyPrint 설치를 포기하고 Excel만 생성
- 코드는 자동으로 WeasyPrint 없이도 작동합니다
- PDF는 생성되지 않지만 Excel은 정상 생성됩니다

---

### 5. 서버 시작은 되지만 PDF 생성 시 에러

**증상**:
```
WeasyPrint를 사용할 수 없습니다. 순수 Python PDF 변환이 비활성화됩니다.
LibreOffice를 찾을 수 없습니다. PDF 변환을 건너뜁니다.
```

**현상**: 정상 동작입니다. Excel 파일은 생성되고 다운로드됩니다.

**PDF가 필요한 경우**:
```bash
# 옵션 1: WeasyPrint 설치 (추천)
pip install weasyprint jinja2

# 옵션 2: LibreOffice 설치
# Ubuntu: sudo apt-get install libreoffice
# Windows: https://www.libreoffice.org/download/download/
```

---

## 백엔드 실행 명령어

### PowerShell (Windows)
```powershell
cd E:\zData\Webtranet\Webtrarev02\backend
.\venv\Scripts\Activate.ps1
python run.py
```

### CMD (Windows)
```cmd
cd E:\zData\Webtranet\Webtrarev02\backend
venv\Scripts\activate.bat
python run.py
```

### Bash (Linux/Mac)
```bash
cd backend
source venv/bin/activate
python run.py
```

---

## 디버깅 팁

### 1. Python import 테스트
```python
# Python 콘솔에서 실행
import sys
print(sys.path)

from app.blueprints.invoice_generator import invoice_generator_bp
print("OK")
```

### 2. 모듈 설치 확인
```bash
pip list | grep -i "weasy\|jinja\|flask\|openpyxl"
```

### 3. 템플릿 경로 확인
```python
import os
print(os.path.abspath('app/templates/invoice_template.html'))
print(os.path.exists('app/templates/invoice_template.html'))
```

---

## 최소 요구사항 (PDF 없이 Excel만)

PDF 생성 없이 Excel만 생성하려면:

**필수**:
- Flask
- openpyxl
- flask-jwt-extended
- flask-cors

**선택적** (PDF 생성용):
- weasyprint
- jinja2

---

## 완전 클린 설치

```bash
# 1. 가상환경 제거
rm -rf venv

# 2. 가상환경 재생성
python -m venv venv

# 3. 활성화
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# 또는
source venv/bin/activate  # Linux/Mac

# 4. 기본 패키지 설치
pip install --upgrade pip
pip install -r requirements.txt

# 5. PDF 지원 (선택)
pip install -r requirements_pdf.txt
```
