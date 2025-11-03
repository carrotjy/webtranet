# 백그라운드에서 백엔드 서버 시작
# VS Code를 종료해도 계속 실행됩니다

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $scriptPath "backend.log"
$pidFile = Join-Path $scriptPath "backend.pid"

Write-Host "백엔드 서버를 백그라운드에서 시작합니다..."
Write-Host "로그 파일: $logFile"

# 기존 프로세스 확인
if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile
    $process = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "기존 백엔드 프로세스 종료 중... (PID: $oldPid)"
        Stop-Process -Id $oldPid -Force
        Start-Sleep -Seconds 2
    }
}

# 가상환경 활성화 및 서버 시작
$startCommand = @"
cd '$scriptPath'
.\venv\Scripts\Activate.ps1
python run.py 2>&1 | Tee-Object -FilePath '$logFile'
"@

# 백그라운드 프로세스로 시작
$process = Start-Process powershell -ArgumentList "-NoExit", "-Command", $startCommand -PassThru -WindowStyle Minimized

# PID 저장
$process.Id | Out-File -FilePath $pidFile -Encoding UTF8

Write-Host "백엔드 서버가 시작되었습니다. (PID: $($process.Id))"
Write-Host ""
Write-Host "서버 상태 확인: Get-Process -Id $($process.Id)"
Write-Host "서버 중지: Stop-Process -Id $($process.Id) -Force"
Write-Host "로그 보기: Get-Content '$logFile' -Tail 50 -Wait"
