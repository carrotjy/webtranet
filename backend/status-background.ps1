# 백그라운드에서 실행 중인 백엔드 서버 상태 확인

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $scriptPath "backend.pid"
$logFile = Join-Path $scriptPath "backend.log"

Write-Host "=== 백엔드 서버 상태 ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $pidFile) {
    $pid = Get-Content $pidFile
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "✓ 서버 실행 중" -ForegroundColor Green
        Write-Host "  PID: $pid"
        Write-Host "  시작 시간: $($process.StartTime)"
        Write-Host "  CPU 사용: $($process.CPU)"
        Write-Host "  메모리 사용: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB"
    } else {
        Write-Host "✗ 서버 실행 안됨 (PID 파일은 존재하지만 프로세스 없음)" -ForegroundColor Red
        Write-Host "  PID 파일 정리 필요"
    }
} else {
    Write-Host "✗ PID 파일 없음" -ForegroundColor Yellow
    
    # 수동으로 백엔드 프로세스 찾기
    $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.Path -like '*webtranet\backend\venv*'}
    
    if ($pythonProcesses) {
        Write-Host ""
        Write-Host "⚠ PID 파일 없이 실행 중인 백엔드 프로세스 발견:" -ForegroundColor Yellow
        $pythonProcesses | ForEach-Object {
            Write-Host "  PID: $($_.Id), 시작 시간: $($_.StartTime)"
        }
    } else {
        Write-Host "  실행 중인 백엔드 프로세스 없음"
    }
}

Write-Host ""
if (Test-Path $logFile) {
    Write-Host "=== 최근 로그 (마지막 10줄) ===" -ForegroundColor Cyan
    Get-Content $logFile -Tail 10
} else {
    Write-Host "로그 파일이 없습니다: $logFile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 명령어 ===" -ForegroundColor Cyan
Write-Host "  로그 실시간 보기: Get-Content '$logFile' -Tail 50 -Wait"
Write-Host "  서버 중지: .\stop-background.ps1"
Write-Host "  서버 재시작: .\stop-background.ps1; .\start-background.ps1"
