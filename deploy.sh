#!/bin/bash
# Webtranet 서버 배포 스크립트 (Linux/Ubuntu)
# Git pull, 빌드, 배포, 재시작을 한번에 수행
# 사용법: ./deploy.sh            (프론트+백엔드 모두)
#         ./deploy.sh --frontend  (프론트엔드만)
#         ./deploy.sh --backend   (백엔드만)
#         ./deploy.sh --skip-git  (git pull 생략)

set -e

# ── 설정 ──────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="webtranet"
VENV_PYTHON="$PROJECT_ROOT/backend/venv/bin/python"
VENV_PIP="$PROJECT_ROOT/backend/venv/bin/pip"
# ──────────────────────────────────────────────────

DEPLOY_FRONTEND=false
DEPLOY_BACKEND=false
SKIP_GIT=false

for arg in "$@"; do
    case $arg in
        --frontend) DEPLOY_FRONTEND=true ;;
        --backend)  DEPLOY_BACKEND=true  ;;
        --skip-git) SKIP_GIT=true        ;;
    esac
done

# 인수 없으면 둘 다
if [ "$DEPLOY_FRONTEND" = false ] && [ "$DEPLOY_BACKEND" = false ]; then
    DEPLOY_FRONTEND=true
    DEPLOY_BACKEND=true
fi

echo "======================================"
echo "Webtranet 서버 배포 스크립트"
echo "======================================"
echo ""

# ── Git 동기화 ────────────────────────────────────
if [ "$SKIP_GIT" = false ]; then
    echo "[Git 동기화]"
    cd "$PROJECT_ROOT"

    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "  - 현재 브랜치: $CURRENT_BRANCH"

    GIT_STATUS=$(git status --porcelain)
    if [ -n "$GIT_STATUS" ]; then
        echo "  ⚠  작업 디렉토리에 변경사항이 있습니다:"
        echo "$GIT_STATUS"
        echo ""
        # 비대화형(SSH 등)이면 자동으로 계속 진행
        if [ -t 0 ]; then
            read -rp "  계속하시겠습니까? (y/n): " CONTINUE
            if [ "$CONTINUE" != "y" ]; then
                echo "  배포가 취소되었습니다."
                exit 0
            fi
        else
            echo "  (비대화형 환경 - 자동으로 계속 진행)"
        fi
    fi

    echo "  - Git pull 실행 중..."
    git fetch origin
    git reset --hard "origin/$CURRENT_BRANCH"
    chmod +x "$PROJECT_ROOT/deploy.sh"

    echo ""
    echo "  ✅ Git 동기화 완료!"
    echo ""
fi

# ── 프론트엔드 빌드 ───────────────────────────────
if [ "$DEPLOY_FRONTEND" = true ]; then
    echo "[프론트엔드 빌드 시작]"
    echo ""
    cd "$PROJECT_ROOT/frontend"

    echo "  - Node 패키지 설치/업데이트 중..."
    npm install

    echo "  - 프론트엔드 빌드 중..."
    npm run build

    BUILD_TIME=$(date "+%Y-%m-%d %H:%M:%S")
    echo "  ✓ 빌드 완료 시간: $BUILD_TIME"
    echo ""
    echo "  ✅ 프론트엔드 배포 완료!"
    echo "     서빙 경로: $PROJECT_ROOT/frontend/build (nginx)"
    echo ""
    echo "  ⚠️  브라우저 캐시 문제 해결 방법:"
    echo "     1. Ctrl + Shift + R (하드 새로고침)"
    echo "     2. 시크릿 모드로 테스트"
    echo ""
fi

# ── 백엔드 배포 및 재시작 ─────────────────────────
if [ "$DEPLOY_BACKEND" = true ]; then
    echo "[백엔드 배포 및 재시작]"
    echo ""
    cd "$PROJECT_ROOT/backend"

    # 가상환경 생성 (없는 경우)
    if [ ! -d "venv" ]; then
        echo "  - 가상환경 생성 중..."
        python3 -m venv venv
    else
        echo "  - 가상환경 이미 존재함"
    fi

    # 의존성 설치
    echo "  - Python 패키지 설치/업데이트 중..."
    "$VENV_PIP" install --upgrade pip --quiet
    "$VENV_PIP" install -r requirements.txt --quiet

    if [ -f "requirements_pdf.txt" ]; then
        "$VENV_PIP" install -r requirements_pdf.txt --quiet
    fi

    # DB 마이그레이션
    cd "$PROJECT_ROOT"
    echo ""
    echo "  - 데이터베이스 마이그레이션 실행 중..."
    if "$VENV_PYTHON" "$PROJECT_ROOT/migrate_db.py"; then
        echo "  ✓ 데이터베이스 마이그레이션 완료"
    else
        echo "  ⚠  마이그레이션 실패 - 수동으로 실행: python3 migrate_db.py"
    fi
    echo ""

    # systemd 서비스 재시작
    if systemctl list-unit-files --quiet "${SERVICE_NAME}.service" &>/dev/null; then
        echo "  - systemd daemon-reload 중..."
        sudo systemctl daemon-reload
        echo "  - systemd 서비스 재시작 중: $SERVICE_NAME"
        sudo systemctl restart "$SERVICE_NAME"
        sleep 2

        if systemctl is-active --quiet "$SERVICE_NAME"; then
            echo "  ✅ 서비스 재시작 완료 (실행 중)"
        else
            echo "  ⚠  서비스 시작 실패: sudo systemctl status $SERVICE_NAME"
        fi
    else
        echo "  ⚠  systemd 서비스 '$SERVICE_NAME' 를 찾을 수 없습니다."
        echo "     서비스 등록 후 재시도하거나 수동으로 시작하세요:"
        echo "     sudo systemctl start $SERVICE_NAME"
    fi

    echo ""
    echo "  ✅ 백엔드 배포 완료!"
    echo ""
fi

cd "$PROJECT_ROOT"

echo "======================================"
echo "서버 배포가 완료되었습니다!"
echo "======================================"
echo ""

if [ "$DEPLOY_FRONTEND" = true ]; then
    echo "프론트엔드: 브라우저에서 Ctrl+Shift+R (강력 새로고침)을 눌러 캐시를 비우세요."
fi
if [ "$DEPLOY_BACKEND" = true ]; then
    echo "백엔드: sudo systemctl status $SERVICE_NAME 으로 상태를 확인하세요."
fi
echo ""
