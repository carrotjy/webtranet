# Webtranet 濡쒖뺄 ?뚯뒪?몄슜 鍮뚮뱶/?ъ떆???ㅽ겕由쏀듃
# ?ъ슜踰? .\deploy_local.ps1 -frontend  ?먮뒗  .\deploy_local.ps1 -backend  ?먮뒗  .\deploy_local.ps1 (????

param(
    [switch]$frontend,
    [switch]$backend
)

$ErrorActionPreference = "Stop"

# 留ㅺ컻蹂?섍? ?놁쑝硫?????泥섎━
if (-not $frontend -and -not $backend) {
    $frontend = $true
    $backend = $true
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Webtranet 濡쒖뺄 鍮뚮뱶/?ъ떆???ㅽ겕由쏀듃" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# ?꾨줎?몄뿏??鍮뚮뱶
if ($frontend) {
    Write-Host "[?꾨줎?몄뿏??鍮뚮뱶 ?쒖옉]" -ForegroundColor Green
    Write-Host ""

    try {
        # 1. ?꾨줎?몄뿏???붾젆?좊━濡??대룞
        Set-Location "$projectRoot\frontend"

        # 2. ?섏〈???뺤씤 諛??ㅼ튂
        if (-not (Test-Path "node_modules")) {
            Write-Host "  - Node ?⑦궎吏 ?ㅼ튂 以?.." -ForegroundColor Yellow
            npm install
        } else {
            Write-Host "  - Node ?⑦궎吏 ?대? ?ㅼ튂?? -ForegroundColor Gray
        }

        # 3. 媛쒕컻 ?쒕쾭媛 ?ㅽ뻾 以묒씤吏 ?뺤씤
        $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

        if ($nodeProcesses) {
            Write-Host "  - ?ㅽ뻾 以묒씤 ?꾨줎?몄뿏??媛쒕컻 ?쒕쾭 諛쒓껄 (PID: $($nodeProcesses.Id -join ', '))" -ForegroundColor Yellow
            $response = Read-Host "    媛쒕컻 ?쒕쾭瑜??ъ떆?묓븯?쒓쿋?듬땲源? (y/n)"
            if ($response -eq 'y') {
                Write-Host "  - 媛쒕컻 ?쒕쾭 以묒? 以?.." -ForegroundColor Yellow
                $nodeProcesses | Stop-Process -Force
                Start-Sleep -Seconds 2
            }
        }

        # 4. ?꾨줈?뺤뀡 鍮뚮뱶
        Write-Host "  - ?꾨줎?몄뿏??鍮뚮뱶 以?.." -ForegroundColor Yellow
        npm run build

        if ($LASTEXITCODE -ne 0) {
            throw "鍮뚮뱶 ?ㅽ뙣"
        }

        Write-Host ""
        Write-Host "  ???꾨줎?몄뿏??鍮뚮뱶 ?꾨즺!" -ForegroundColor Green
        Write-Host "     鍮뚮뱶 寃쎈줈: $projectRoot\frontend\build" -ForegroundColor Gray
        Write-Host ""

        # 5. 媛쒕컻 ?쒕쾭 ?ㅽ뻾 ?щ? ?뺤씤
        $startDev = Read-Host "  媛쒕컻 ?쒕쾭瑜??ㅽ뻾?섏떆寃좎뒿?덇퉴? (y/n)"
        if ($startDev -eq 'y') {
            Write-Host "  - 媛쒕컻 ?쒕쾭 ?쒖옉 以?.." -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm start"
            Write-Host "  - 媛쒕컻 ?쒕쾭媛 ??李쎌뿉???ㅽ뻾?⑸땲?? -ForegroundColor Green
        }

    } catch {
        Write-Host ""
        Write-Host "  ???꾨줎?몄뿏??鍮뚮뱶 ?ㅽ뙣: $_" -ForegroundColor Red
        Write-Host ""
        Set-Location $projectRoot
        exit 1
    }
}

# 諛깆뿏???ъ떆??
if ($backend) {
    Write-Host "[諛깆뿏???ъ떆???쒖옉]" -ForegroundColor Green
    Write-Host ""

    try {
        # 1. 諛깆뿏???붾젆?좊━濡??대룞
        Set-Location "$projectRoot\backend"

        # 2. 媛?곹솚寃??뺤씤
        if (-not (Test-Path "venv")) {
            Write-Host "  - 媛?곹솚寃??앹꽦 以?.." -ForegroundColor Yellow
            python -m venv venv
        } else {
            Write-Host "  - 媛?곹솚寃??대? 議댁옱?? -ForegroundColor Gray
        }

        # 3. ?섏〈???ㅼ튂 (媛?곹솚寃쎌쓽 pip瑜?吏곸젒 ?ъ슜)
        Write-Host "  - Python ?⑦궎吏 ?ㅼ튂 以?.." -ForegroundColor Yellow
        & ".\venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet

        if (Test-Path "requirements_pdf.txt") {
            & ".\venv\Scripts\python.exe" -m pip install -r requirements_pdf.txt --quiet
        }

        # 4. ?ㅽ뻾 以묒씤 諛깆뿏???꾨줈?몄뒪 ?뺤씤 諛?醫낅즺
        $pythonProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*webtranet*backend\venv*" }

        if ($pythonProcesses) {
            Write-Host "  - ?ㅽ뻾 以묒씤 諛깆뿏???꾨줈?몄뒪 諛쒓껄 (PID: $($pythonProcesses.Id -join ', '))" -ForegroundColor Yellow
            Write-Host "  - 諛깆뿏???꾨줈?몄뒪 以묒? 以?.." -ForegroundColor Yellow
            $pythonProcesses | Stop-Process -Force
            Start-Sleep -Seconds 2
            Write-Host "  - 諛깆뿏???꾨줈?몄뒪 以묒? ?꾨즺" -ForegroundColor Green
        } else {
            Write-Host "  - ?ㅽ뻾 以묒씤 諛깆뿏???꾨줈?몄뒪 ?놁쓬" -ForegroundColor Gray
        }

        # 5. 諛깆뿏???ㅽ뻾 ?щ? ?뺤씤
        $startBackend = Read-Host "  諛깆뿏?쒕? ?ㅽ뻾?섏떆寃좎뒿?덇퉴? (y/n)"
        if ($startBackend -eq 'y') {
            Write-Host "  - 諛깆뿏???쒖옉 以?.." -ForegroundColor Yellow

            # run.py媛 ?덈뒗吏 ?뺤씤
            if (Test-Path "run.py") {
                Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; .\venv\Scripts\python.exe run.py"
                Write-Host "  - 諛깆뿏?쒓? ??李쎌뿉???ㅽ뻾?⑸땲?? -ForegroundColor Green
            } else {
                Write-Host "  ??run.py ?뚯씪??李얠쓣 ???놁뒿?덈떎" -ForegroundColor Red
            }
        }

        Write-Host ""
        Write-Host "  ??諛깆뿏???ъ떆???꾨즺!" -ForegroundColor Green
        Write-Host ""

    } catch {
        Write-Host ""
        Write-Host "  ??諛깆뿏???ъ떆???ㅽ뙣: $_" -ForegroundColor Red
        Write-Host ""
        Set-Location $projectRoot
        exit 1
    }
}

# ?꾨줈?앺듃 猷⑦듃濡?蹂듦?
Set-Location $projectRoot

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "濡쒖뺄 鍮뚮뱶/?ъ떆?묒씠 ?꾨즺?섏뿀?듬땲??" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($frontend) {
    Write-Host "?꾨줎?몄뿏??媛쒕컻 ?쒕쾭: http://localhost:3000" -ForegroundColor Yellow
}

if ($backend) {
    Write-Host "諛깆뿏??API ?쒕쾭: http://localhost:5000" -ForegroundColor Yellow
}

Write-Host ""

