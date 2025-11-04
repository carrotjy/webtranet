# Webtranet local test build/restart script
# Usage: .\deploy_local.ps1 -frontend  or  .\deploy_local.ps1 -backend  or  .\deploy_local.ps1 (both)

param(
    [switch]$frontend,
    [switch]$backend
)

$ErrorActionPreference = "Stop"

# If no parameters, process both
if (-not $frontend -and -not $backend) {
    $frontend = $true
    $backend = $true
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet Local Build/Restart" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# Frontend build
if ($frontend) {
    Write-Host "[Frontend Build Start]" -ForegroundColor Green
    Write-Host ""

    try {
        # 1. Move to frontend directory
        Set-Location "$projectRoot\frontend"

        # 2. Check and install dependencies
        if (-not (Test-Path "node_modules")) {
            Write-Host "  - Installing Node packages..." -ForegroundColor Yellow
            npm install
        }
        else {
            Write-Host "  - Node packages already installed" -ForegroundColor Gray
        }

        # 3. Check if dev server is running
        $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

        if ($nodeProcesses) {
            Write-Host "  - Found running frontend dev server" -ForegroundColor Yellow
            $response = Read-Host "    Restart dev server? (y/n)"
            if ($response -eq 'y') {
                Write-Host "  - Stopping dev server..." -ForegroundColor Yellow
                $nodeProcesses | Stop-Process -Force
                Start-Sleep -Seconds 2
            }
        }

        # 4. Production build
        Write-Host "  - Building frontend..." -ForegroundColor Yellow
        npm run build

        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }

        Write-Host ""
        Write-Host "  Frontend build complete!" -ForegroundColor Green
        Write-Host "     Build path: $projectRoot\frontend\build" -ForegroundColor Gray
        Write-Host ""

        # 5. Ask to start dev server
        $startDev = Read-Host "  Start dev server? (y/n)"
        if ($startDev -eq 'y') {
            Write-Host "  - Starting dev server..." -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm start"
            Write-Host "  - Dev server running in new window" -ForegroundColor Green
        }
    }
    catch {
        Write-Host ""
        Write-Host "  Frontend build failed: $_" -ForegroundColor Red
        Write-Host ""
        Set-Location $projectRoot
        exit 1
    }
}

# Backend restart
if ($backend) {
    Write-Host "[Backend Restart Start]" -ForegroundColor Green
    Write-Host ""

    try {
        # 1. Move to backend directory
        Set-Location "$projectRoot\backend"

        # 2. Check virtual environment
        if (-not (Test-Path "venv")) {
            Write-Host "  - Creating virtual environment..." -ForegroundColor Yellow
            python -m venv venv
        }
        else {
            Write-Host "  - Virtual environment exists" -ForegroundColor Gray
        }

        # 3. Install dependencies
        Write-Host "  - Installing Python packages..." -ForegroundColor Yellow
        & ".\venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet

        if (Test-Path "requirements_pdf.txt") {
            & ".\venv\Scripts\python.exe" -m pip install -r requirements_pdf.txt --quiet
        }

        # 4. Check and stop running backend processes
        $allPythonProcesses = Get-Process python -ErrorAction SilentlyContinue
        $pythonProcesses = @()

        foreach ($proc in $allPythonProcesses) {
            if ($proc.Path -like "*webtranet*backend\venv*") {
                $pythonProcesses += $proc
            }
        }

        if ($pythonProcesses.Count -gt 0) {
            Write-Host "  - Found running backend process" -ForegroundColor Yellow
            Write-Host "  - Stopping backend process..." -ForegroundColor Yellow
            $pythonProcesses | Stop-Process -Force
            Start-Sleep -Seconds 2
            Write-Host "  - Backend process stopped" -ForegroundColor Green
        }
        else {
            Write-Host "  - No running backend process" -ForegroundColor Gray
        }

        # 5. Ask to start backend
        $startBackend = Read-Host "  Start backend? (y/n)"
        if ($startBackend -eq 'y') {
            Write-Host "  - Starting backend..." -ForegroundColor Yellow

            # Check if run.py exists
            if (Test-Path "run.py") {
                Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; .\venv\Scripts\python.exe run.py"
                Write-Host "  - Backend running in new window" -ForegroundColor Green
            }
            else {
                Write-Host "  run.py file not found" -ForegroundColor Red
            }
        }

        Write-Host ""
        Write-Host "  Backend restart complete!" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host ""
        Write-Host "  Backend restart failed: $_" -ForegroundColor Red
        Write-Host ""
        Set-Location $projectRoot
        exit 1
    }
}

# Return to project root
Set-Location $projectRoot

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Build/Restart Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($frontend) {
    Write-Host "Frontend dev server: http://localhost:3000" -ForegroundColor Yellow
}

if ($backend) {
    Write-Host "Backend API server: http://localhost:5000" -ForegroundColor Yellow
}

Write-Host ""
