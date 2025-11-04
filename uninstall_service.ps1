# Webtranet Backend Windows Service Uninstallation Script
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
Write-Host "Webtranet Backend Service Uninstallation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if service exists
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $service) {
    Write-Host "Service '$ServiceName' not found!" -ForegroundColor Yellow
    Write-Host "Available services:" -ForegroundColor Gray
    Get-Service | Where-Object { $_.Name -like "*webtranet*" -or $_.DisplayName -like "*webtranet*" } | Format-Table Name, DisplayName, Status
    exit 0
}

Write-Host "Found service: $($service.DisplayName)" -ForegroundColor Gray
Write-Host "Status: $($service.Status)" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Are you sure you want to remove this service? (yes/no)"
if ($confirm -ne 'yes') {
    Write-Host "Uninstallation cancelled." -ForegroundColor Yellow
    exit 0
}

# Stop service if running
if ($service.Status -eq 'Running') {
    Write-Host "Stopping service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 3
}

# Check if NSSM is available
$nssmPath = (Get-Command nssm -ErrorAction SilentlyContinue).Source

if ($nssmPath) {
    Write-Host "Removing service using NSSM..." -ForegroundColor Yellow
    & nssm remove $ServiceName confirm
} else {
    Write-Host "Removing service using sc.exe..." -ForegroundColor Yellow
    sc.exe delete $ServiceName
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Service removed successfully!" -ForegroundColor Green

    # Remove wrapper script if exists
    $projectRoot = $PSScriptRoot
    $backendPath = Join-Path $projectRoot "backend"
    $wrapperScript = Join-Path $backendPath "service_wrapper.bat"

    if (Test-Path $wrapperScript) {
        Remove-Item $wrapperScript -Force
        Write-Host "Wrapper script removed." -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "Failed to remove service!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Uninstallation Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
