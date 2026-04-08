# Webtranet 원격 배포 스크립트 (Windows → Linux SSH)
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

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet 원격 배포 (SSH)" -ForegroundColor Cyan
Write-Host "대상: $REMOTE" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# SSH 연결 테스트
Write-Host "  - SSH 연결 확인 중..." -ForegroundColor Yellow
$sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes $REMOTE "echo OK" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ SSH 연결 실패." -ForegroundColor Red
    Write-Host "     SSH 키 등록 방법:" -ForegroundColor Gray
    Write-Host "       ssh-keygen -t ed25519" -ForegroundColor Gray
    Write-Host "       type `$env:USERPROFILE\.ssh\id_ed25519.pub | ssh $REMOTE 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'" -ForegroundColor Gray
    exit 1
}
Write-Host "  ✅ SSH 연결 성공" -ForegroundColor Green
Write-Host ""

# deploy.sh 인수 조합
$deployArgs = ""
if ($frontend -and -not $backend) { $deployArgs = "--frontend" }
elseif ($backend -and -not $frontend) { $deployArgs = "--backend" }
if ($skipGit) { $deployArgs = "$deployArgs --skip-git".Trim() }

# 원격 실행
Write-Host "  - 원격 배포 시작..." -ForegroundColor Yellow
Write-Host ""

ssh $REMOTE "cd $UBUNTU_PATH && bash deploy.sh $deployArgs"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "✅ 원격 배포 완료!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "  ❌ 배포 실패 (종료 코드: $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}
