# Webtranet Backend Windows Service Installation Script
# Run as Administrator

param(
    [string]$ServiceName = "WebtranetBackend"
)

$ErrorActionPreference = "Stop"

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet Backend Service Installation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$pythonExe = Join-Path $backendPath "venv\Scripts\python.exe"
$runPy = Join-Path $backendPath "run.py"

# Check if backend directory exists
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path $pythonExe)) {
    Write-Host "ERROR: Python virtual environment not found!" -ForegroundColor Red
    Write-Host "Please create virtual environment first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\python.exe -m pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Check if run.py exists
if (-not (Test-Path $runPy)) {
    Write-Host "ERROR: run.py not found: $runPy" -ForegroundColor Red
    exit 1
}

Write-Host "Project Root: $projectRoot" -ForegroundColor Gray
Write-Host "Backend Path: $backendPath" -ForegroundColor Gray
Write-Host "Python Exe: $pythonExe" -ForegroundColor Gray
Write-Host "Run Script: $runPy" -ForegroundColor Gray
Write-Host ""

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "Service '$ServiceName' already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to remove and reinstall? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Installation cancelled." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "Stopping service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "Removing existing service..." -ForegroundColor Yellow
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Check if NSSM is available
$nssmPath = (Get-Command nssm -ErrorAction SilentlyContinue).Source

if (-not $nssmPath) {
    Write-Host "NSSM not found in PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install NSSM using Chocolatey (Recommended)" -ForegroundColor Cyan
    Write-Host "  choco install nssm" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Download NSSM manually" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://nssm.cc/download" -ForegroundColor Gray
    Write-Host "  2. Extract nssm.exe to a folder in PATH (e.g., C:\Windows\System32)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 3: Create service without NSSM (using sc.exe)" -ForegroundColor Cyan
    Write-Host ""
    $response = Read-Host "Use sc.exe method? (y/n)"

    if ($response -eq 'y') {
        # Create a wrapper script for sc.exe method
        $wrapperScript = Join-Path $backendPath "service_wrapper.bat"
        $wrapperContent = @"
@echo off
cd /d "$backendPath"
"$pythonExe" "$runPy"
"@
        Set-Content -Path $wrapperScript -Value $wrapperContent -Encoding ASCII

        Write-Host "Creating service using sc.exe..." -ForegroundColor Yellow
        sc.exe create $ServiceName binPath= "`"$wrapperScript`"" start= auto DisplayName= "Webtranet Backend Service"

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Service created successfully!" -ForegroundColor Green
            Write-Host "Service Name: $ServiceName" -ForegroundColor Gray
            Write-Host ""

            $startNow = Read-Host "Start service now? (y/n)"
            if ($startNow -eq 'y') {
                Start-Service -Name $ServiceName
                Write-Host "Service started!" -ForegroundColor Green
            }
        } else {
            Write-Host "Failed to create service!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Installation cancelled. Please install NSSM first." -ForegroundColor Yellow
        exit 0
    }
} else {
    # Use NSSM to create service
    Write-Host "Found NSSM: $nssmPath" -ForegroundColor Green
    Write-Host "Creating service using NSSM..." -ForegroundColor Yellow

    # Install service
    & nssm install $ServiceName $pythonExe $runPy

    # Set service parameters
    & nssm set $ServiceName AppDirectory $backendPath
    & nssm set $ServiceName DisplayName "Webtranet Backend Service"
    & nssm set $ServiceName Description "Webtranet Flask Backend API Server"
    & nssm set $ServiceName Start SERVICE_AUTO_START

    # Set output logging
    $logDir = Join-Path $backendPath "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    & nssm set $ServiceName AppStdout (Join-Path $logDir "service.log")
    & nssm set $ServiceName AppStderr (Join-Path $logDir "service_error.log")

    # Set restart policy
    & nssm set $ServiceName AppRestartDelay 5000
    & nssm set $ServiceName AppExit Default Restart

    Write-Host ""
    Write-Host "Service created successfully!" -ForegroundColor Green
    Write-Host "Service Name: $ServiceName" -ForegroundColor Gray
    Write-Host "Log Directory: $logDir" -ForegroundColor Gray
    Write-Host ""

    $startNow = Read-Host "Start service now? (y/n)"
    if ($startNow -eq 'y') {
        & nssm start $ServiceName
        Start-Sleep -Seconds 2

        $serviceStatus = Get-Service -Name $ServiceName
        if ($serviceStatus.Status -eq 'Running') {
            Write-Host "Service started successfully!" -ForegroundColor Green
        } else {
            Write-Host "Service failed to start. Check logs for details." -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  Start service:   Start-Service -Name $ServiceName" -ForegroundColor Gray
Write-Host "  Stop service:    Stop-Service -Name $ServiceName" -ForegroundColor Gray
Write-Host "  Restart service: Restart-Service -Name $ServiceName" -ForegroundColor Gray
Write-Host "  Check status:    Get-Service -Name $ServiceName" -ForegroundColor Gray
if ($nssmPath) {
    Write-Host "  Edit service:    nssm edit $ServiceName" -ForegroundColor Gray
    Write-Host "  Remove service:  nssm remove $ServiceName confirm" -ForegroundColor Gray
} else {
    Write-Host "  Remove service:  sc.exe delete $ServiceName" -ForegroundColor Gray
}
Write-Host ""
