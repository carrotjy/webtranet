# 백그라운드에서 실행 중인 백엔드 서버 중지

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $scriptPath "backend.pid"

if (Test-Path $pidFile) {
    $pid = Get-Content $pidFile
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "백엔드 서버 종료 중... (PID: $pid)"
        Stop-Process -Id $pid -Force
        Remove-Item $pidFile
        Write-Host "백엔드 서버가 종료되었습니다."
    } else {
        Write-Host "실행 중인 백엔드 서버를 찾을 수 없습니다. (PID: $pid)"
        Remove-Item $pidFile
    }
} else {
    Write-Host "PID 파일이 없습니다. 수동으로 프로세스를 확인하세요."
    Write-Host ""
    $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.Path -like '*webtranet\backend\venv*'}
    
    if ($pythonProcesses) {
        Write-Host "발견된 백엔드 프로세스:"
        $pythonProcesses | ForEach-Object {
            Write-Host "  PID: $($_.Id), 시작 시간: $($_.StartTime)"
        }
        Write-Host ""
        $response = Read-Host "이 프로세스들을 종료하시겠습니까? (y/n)"
        if ($response -eq 'y') {
            $pythonProcesses | ForEach-Object {
                Stop-Process -Id $_.Id -Force
            }
            Write-Host "프로세스가 종료되었습니다."
        }
    } else {
        Write-Host "실행 중인 백엔드 프로세스가 없습니다."
    }
}
