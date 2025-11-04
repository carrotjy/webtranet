# Webtranet 서버 배포 스크립트 (Windows Server)
# Git pull, 빌드, 배포, 재시작을 한번에 수행
# 사용법: .\deploy_server.ps1 -frontend  또는  .\deploy_server.ps1 -backend  또는  .\deploy_server.ps1 (둘 다)

param(
    [switch]$frontend,
    [switch]$backend,
    [switch]$skipGit
)

$ErrorActionPreference = "Stop"

# 매개변수가 없으면 둘 다 배포
if (-not $frontend -and -not $backend) {
    $frontend = $true
    $backend = $true
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet 서버 배포 스크립트" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$iisPath = "C:\inetpub\wwwroot\webtranet"

# Git 동기화
if (-not $skipGit) {
    Write-Host "[Git 동기화]" -ForegroundColor Green
    Write-Host ""

    try {
        Set-Location $projectRoot

        # 현재 브랜치 확인
        $currentBranch = git rev-parse --abbrev-ref HEAD
        Write-Host "  - 현재 브랜치: $currentBranch" -ForegroundColor Gray

        # 변경사항 확인
        $gitStatus = git status --porcelain
        if ($gitStatus) {
            Write-Host "  ⚠ 작업 디렉토리에 변경사항이 있습니다:" -ForegroundColor Yellow
            Write-Host $gitStatus -ForegroundColor Gray
            Write-Host ""
            $continue = Read-Host "  계속하시겠습니까? (y/n)"
            if ($continue -ne 'y') {
                Write-Host "  배포가 취소되었습니다." -ForegroundColor Yellow
                exit 0
            }
        }

        # Git pull
        Write-Host "  - Git pull 실행 중..." -ForegroundColor Yellow
        git fetch origin
        git pull origin $currentBranch

        if ($LASTEXITCODE -ne 0) {
            throw "Git pull 실패"
        }

        Write-Host ""
        Write-Host "  ✅ Git 동기화 완료!" -ForegroundColor Green
        Write-Host ""

    } catch {
        Write-Host ""
        Write-Host "  ❌ Git 동기화 실패: $_" -ForegroundColor Red
        Write-Host ""
        Set-Location $projectRoot
        exit 1
    }
}

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
            Write-Host "  - Node 패키지 업데이트 확인 중..." -ForegroundColor Yellow
            npm install
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

# 백엔드 배포 및 재시작
if ($backend) {
    Write-Host "[백엔드 배포 및 재시작]" -ForegroundColor Green
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
        Write-Host "  - Python 패키지 설치/업데이트 중..." -ForegroundColor Yellow
        & ".\venv\Scripts\python.exe" -m pip install --upgrade pip --quiet
        & ".\venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet

        if (Test-Path "requirements_pdf.txt") {
            & ".\venv\Scripts\python.exe" -m pip install -r requirements_pdf.txt --quiet
        }

        # 4. 백엔드 서비스 재시작
        $serviceName = "WebtranetBackend"
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

        if ($service) {
            Write-Host "  - Windows 서비스 발견: $serviceName" -ForegroundColor Green
            Write-Host "  - 서비스 재시작 중..." -ForegroundColor Yellow

            try {
                Restart-Service -Name $serviceName -Force
                Start-Sleep -Seconds 3

                $serviceStatus = Get-Service -Name $serviceName
                if ($serviceStatus.Status -eq 'Running') {
                    Write-Host "  - 서비스 재시작 완료" -ForegroundColor Green
                } else {
                    Write-Host "  - 서비스 상태: $($serviceStatus.Status)" -ForegroundColor Yellow
                    Write-Host "    수동으로 시작: Start-Service -Name $serviceName" -ForegroundColor Gray
                }
            } catch {
                Write-Host "  ⚠ 서비스 재시작 실패: $_" -ForegroundColor Red
                Write-Host "    수동으로 재시작: Restart-Service -Name $serviceName" -ForegroundColor Gray
            }
        } else {
            Write-Host "  - Windows 서비스가 등록되지 않음" -ForegroundColor Yellow
            Write-Host "  - 프로세스 방식으로 재시작 시도..." -ForegroundColor Yellow

            # 실행 중인 백엔드 프로세스 확인 및 종료
            $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue |
                Where-Object { $_.Path -like "*webtranet*backend\venv*" }

            if ($pythonProcesses) {
                Write-Host "  - 실행 중인 백엔드 프로세스 발견 (PID: $($pythonProcesses.Id -join ', '))" -ForegroundColor Yellow
                Write-Host "  - 백엔드 프로세스 중지 중..." -ForegroundColor Yellow
                $pythonProcesses | Stop-Process -Force
                Start-Sleep -Seconds 3
                Write-Host "  - 백엔드 프로세스 중지 완료" -ForegroundColor Green
            } else {
                Write-Host "  - 실행 중인 백엔드 프로세스 없음" -ForegroundColor Gray
            }

            Write-Host ""
            Write-Host "  참고: Windows 서비스로 등록하려면 다음 스크립트를 실행하세요:" -ForegroundColor Cyan
            Write-Host "    .\install_service.ps1" -ForegroundColor Gray
            Write-Host "  서비스 등록 후에는 자동으로 재시작됩니다." -ForegroundColor Gray
        }

        Write-Host ""
        Write-Host "  ✅ 백엔드 배포 완료!" -ForegroundColor Green
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
Write-Host "서버 배포가 완료되었습니다!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($frontend) {
    Write-Host "프론트엔드: 브라우저에서 Ctrl+Shift+R (강력 새로고침)을 눌러 캐시를 비우세요." -ForegroundColor Yellow
}

if ($backend) {
    Write-Host "백엔드: 서비스가 정상적으로 실행 중인지 확인하세요." -ForegroundColor Yellow
}

Write-Host ""
