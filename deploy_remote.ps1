# Webtranet 원격 배포 스크립트 (Windows -> Linux SSH)
# 사용법: .\deploy_remote.ps1            (프론트+백엔드 모두)
#         .\deploy_remote.ps1 -frontend  (프론트엔드만)
#         .\deploy_remote.ps1 -backend   (백엔드만)
#         .\deploy_remote.ps1 -skipGit   (git pull 생략)

param(
    [switch]$frontend,
    [switch]$backend,
    [switch]$skipGit
)

$UBUNTU_USER = "jhi"
$UBUNTU_HOST = "192.168.0.62"
$UBUNTU_PATH = "/home/jhi/webtranet"
$REMOTE = "${UBUNTU_USER}@${UBUNTU_HOST}"
$PROJECT_ROOT = $PSScriptRoot

# UTF-8 출력 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet Remote Deploy (SSH)" -ForegroundColor Cyan
Write-Host "Target: $REMOTE" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# SSH 연결 테스트
Write-Host "  - SSH connection check..." -ForegroundColor Yellow
$sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes $REMOTE "echo OK" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] SSH connection failed." -ForegroundColor Red
    Write-Host "     Register SSH key:" -ForegroundColor Gray
    Write-Host "       ssh-keygen -t ed25519" -ForegroundColor Gray
    Write-Host "       type `$env:USERPROFILE\.ssh\id_ed25519.pub | ssh $REMOTE 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'" -ForegroundColor Gray
    exit 1
}
Write-Host "  [OK] SSH connected" -ForegroundColor Green
Write-Host ""

# deploy.sh를 서버에 먼저 업로드 (항상 최신 버전 유지)
Write-Host "  - Uploading deploy.sh..." -ForegroundColor Yellow
scp "$PROJECT_ROOT\deploy.sh" "${REMOTE}:${UBUNTU_PATH}/deploy.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] deploy.sh upload failed" -ForegroundColor Red
    exit 1
}
ssh $REMOTE "chmod +x $UBUNTU_PATH/deploy.sh"
Write-Host "  [OK] deploy.sh uploaded" -ForegroundColor Green
Write-Host ""

# deploy.sh 인수 조합
$deployArgs = ""
if ($frontend -and -not $backend) { $deployArgs = "--frontend" }
elseif ($backend -and -not $frontend) { $deployArgs = "--backend" }
if ($skipGit) { $deployArgs = "$deployArgs --skip-git".Trim() }

# 원격 실행
Write-Host "  - Starting remote deploy..." -ForegroundColor Yellow
Write-Host ""

ssh $REMOTE "cd $UBUNTU_PATH && bash deploy.sh $deployArgs"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "[OK] Remote deploy complete!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "  [FAIL] Deploy failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}
