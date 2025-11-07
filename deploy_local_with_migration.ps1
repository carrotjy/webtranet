# Webtranet 로컬 배포 스크립트 (DB 마이그레이션 포함)
# 마이그레이션을 먼저 실행한 후 프론트엔드 빌드 및 백엔드 재시작
# 사용법: .\deploy_local_with_migration.ps1

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet 로컬 배포 (마이그레이션 포함)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

try {
    # 1. 데이터베이스 마이그레이션
    Write-Host "[1/3] 데이터베이스 마이그레이션" -ForegroundColor Green
    Write-Host ""

    Set-Location $projectRoot

    # 백엔드 가상환경 확인
    if (-not (Test-Path "backend\venv\Scripts\python.exe")) {
        Write-Host "  ⚠ 백엔드 가상환경이 없습니다. 먼저 설치하세요:" -ForegroundColor Yellow
        Write-Host "    cd backend && python -m venv venv && .\venv\Scripts\pip install -r requirements.txt" -ForegroundColor Gray
        exit 1
    }

    Write-Host "  - 마이그레이션 스크립트 실행 중..." -ForegroundColor Yellow
    & ".\backend\venv\Scripts\python.exe" ".\migrate_db.py"

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  ❌ 마이그레이션 실패" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "  ✅ 마이그레이션 완료!" -ForegroundColor Green
    Write-Host ""

    # 2. 프론트엔드 빌드
    Write-Host "[2/3] 프론트엔드 빌드" -ForegroundColor Green
    Write-Host ""

    Set-Location "$projectRoot\frontend"

    Write-Host "  - 프론트엔드 빌드 중..." -ForegroundColor Yellow
    npm run build

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  ❌ 빌드 실패" -ForegroundColor Red
        Set-Location $projectRoot
        exit 1
    }

    Write-Host ""
    Write-Host "  ✅ 빌드 완료!" -ForegroundColor Green
    Write-Host ""

    # 3. 백엔드 재시작
    Write-Host "[3/3] 백엔드 재시작" -ForegroundColor Green
    Write-Host ""

    Set-Location $projectRoot

    # 실행 중인 백엔드 프로세스 찾기
    $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -like "*$projectRoot*backend\venv*" }

    if ($pythonProcesses) {
        Write-Host "  - 실행 중인 백엔드 프로세스 발견 (PID: $($pythonProcesses.Id -join ', '))" -ForegroundColor Yellow
        Write-Host "  - 백엔드 프로세스 중지 중..." -ForegroundColor Yellow
        $pythonProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "  - 백엔드 프로세스 중지 완료" -ForegroundColor Green
    } else {
        Write-Host "  - 실행 중인 백엔드 프로세스 없음" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "  백엔드를 다시 시작하려면:" -ForegroundColor Cyan
    Write-Host "    cd backend" -ForegroundColor Gray
    Write-Host "    .\venv\Scripts\python.exe run.py" -ForegroundColor Gray
    Write-Host ""

    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "배포가 완료되었습니다!" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Yellow
    Write-Host "  1. 백엔드 재시작: cd backend && .\venv\Scripts\python.exe run.py" -ForegroundColor Gray
    Write-Host "  2. 프론트엔드 확인: npm start" -ForegroundColor Gray
    Write-Host "  3. 브라우저에서 Ctrl+Shift+R로 캐시 비우기" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ 배포 실패: $_" -ForegroundColor Red
    Write-Host ""
    Set-Location $projectRoot
    exit 1
}

Set-Location $projectRoot
