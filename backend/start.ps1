# Flask 백엔드 시작 스크립트
# 사용법: .\start.ps1

Write-Host "가상환경 활성화 중..." -ForegroundColor Green
& "$PSScriptRoot\venv\Scripts\Activate.ps1"

Write-Host "Flask 서버 시작 중..." -ForegroundColor Green
python "$PSScriptRoot\run.py"
