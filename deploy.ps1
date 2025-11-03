# Webtranet 배포 스크립트 (Windows IIS)
# 사용법: .\deploy.ps1 -frontend  또는  .\deploy.ps1 -backend  또는  .\deploy.ps1 (둘 다)

param(
    [switch]$frontend,
    [switch]$backend
)

$ErrorActionPreference = "Stop"

# 매개변수가 없으면 둘 다 배포
if (-not $frontend -and -not $backend) {
    $frontend = $true
    $backend = $true
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet 배포 스크립트 (Windows IIS)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$iisPath = "C:\inetpub\wwwroot\webtranet"

# 프론트엔드 배포
if ($frontend) {
    Write-Host "[프론트엔드 배포 시작]" -ForegroundColor Green
    Write-Host ""
    
    try {
        # 1. 프론트엔드 디렉토리로 이동
        Set-Location "$projectRoot\frontend"
        
        # 2. 의존성 확인 및 설치
        if (-not (Test-Path "node_modules")) {
            Write-Host "  - Node 패키지 설치 중..." -ForegroundColor Yellow
            npm install
        } else {
            Write-Host "  - Node 패키지 이미 설치됨" -ForegroundColor Gray
        }
        
        # 3. 프로덕션 빌드
        Write-Host "  - 프론트엔드 빌드 중..." -ForegroundColor Yellow
        npm run build
        
        if ($LASTEXITCODE -ne 0) {
            throw "빌드 실패"
        }
        
        # 4. IIS 경로로 복사
        Write-Host "  - IIS 경로로 복사 중..." -ForegroundColor Yellow
        
        if (-not (Test-Path $iisPath)) {
            Write-Host "    경고: IIS 경로가 존재하지 않습니다. 생성합니다: $iisPath" -ForegroundColor Yellow
            New-Item -ItemType Directory -Path $iisPath -Force | Out-Null
        }
        
        # web.config를 제외하고 모든 파일 복사 (미러링)
        robocopy "$projectRoot\frontend\build" $iisPath /MIR /XF web.config /NFL /NDL /NJH /NJS
        
        # robocopy 종료 코드 처리 (0-7은 성공)
        if ($LASTEXITCODE -gt 7) {
            throw "파일 복사 실패"
        }
        
        Write-Host ""
        Write-Host "  ✅ 프론트엔드 배포 완료!" -ForegroundColor Green
        Write-Host "     배포 경로: $iisPath" -ForegroundColor Gray
        Write-Host ""
        
    } catch {
        Write-Host ""
        Write-Host "  ❌ 프론트엔드 배포 실패: $_" -ForegroundColor Red
        Write-Host ""
        Set-Location $projectRoot
        exit 1
    }
}

# 백엔드 배포
if ($backend) {
    Write-Host "[백엔드 배포 시작]" -ForegroundColor Green
    Write-Host ""
    
    try {
        # 1. 백엔드 디렉토리로 이동
        Set-Location "$projectRoot\backend"
        
        # 2. 가상환경 확인
        if (-not (Test-Path "venv")) {
            Write-Host "  - 가상환경 생성 중..." -ForegroundColor Yellow
            python -m venv venv
        } else {
            Write-Host "  - 가상환경 이미 존재함" -ForegroundColor Gray
        }

        # 3. 의존성 설치 (가상환경의 pip를 직접 사용)
        Write-Host "  - Python 패키지 설치 중..." -ForegroundColor Yellow
        & ".\venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet

        if (Test-Path "requirements_pdf.txt") {
            & ".\venv\Scripts\python.exe" -m pip install -r requirements_pdf.txt --quiet
        }

        # 4. 실행 중인 백엔드 프로세스 확인
        $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue | 
            Where-Object { $_.Path -like "*webtranet\backend\venv*" }
        
        if ($pythonProcesses) {
            Write-Host "  - 실행 중인 백엔드 프로세스 발견" -ForegroundColor Yellow
            Write-Host "    프로세스를 중지하려면 다음 명령을 실행하세요:" -ForegroundColor Yellow
            Write-Host "    Get-Process python | Where-Object {`$_.Path -like '*webtranet\backend\venv*'} | Stop-Process -Force" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "    또는 수동으로 백엔드를 재시작하세요." -ForegroundColor Yellow
        } else {
            Write-Host "  - 실행 중인 백엔드 프로세스 없음" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "  ✅ 백엔드 배포 완료!" -ForegroundColor Green
        Write-Host "     백엔드를 재시작하려면: .\backend\start.ps1" -ForegroundColor Gray
        Write-Host ""
        
    } catch {
        Write-Host ""
        Write-Host "  ❌ 백엔드 배포 실패: $_" -ForegroundColor Red
        Write-Host ""
        Set-Location $projectRoot
        exit 1
    }
}

# 프로젝트 루트로 복귀
Set-Location $projectRoot

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "배포가 완료되었습니다!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($frontend) {
    Write-Host "브라우저에서 Ctrl+Shift+R (강력 새로고침)을 눌러 캐시를 비우세요." -ForegroundColor Yellow
}

Write-Host ""
