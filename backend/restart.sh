#!/bin/bash
# Gunicorn 재시작 스크립트

echo "=== Gunicorn 재시작 ==="
echo ""

# systemd 서비스로 재시작 시도
if sudo systemctl restart gunicorn 2>/dev/null; then
    echo "✅ Gunicorn이 systemd로 재시작되었습니다."
    sudo systemctl status gunicorn --no-pager -l
else
    echo "systemd 서비스가 없습니다. 프로세스를 직접 재시작합니다..."

    # Gunicorn 프로세스 찾기
    PIDS=$(ps aux | grep gunicorn | grep -v grep | awk '{print $2}')

    if [ -z "$PIDS" ]; then
        echo "❌ 실행 중인 Gunicorn 프로세스가 없습니다."
        exit 1
    fi

    echo "Gunicorn 프로세스 종료 중..."
    echo "$PIDS" | xargs kill

    sleep 2

    # 아직 살아있는 프로세스가 있으면 강제 종료
    REMAINING=$(ps aux | grep gunicorn | grep -v grep | awk '{print $2}')
    if [ -n "$REMAINING" ]; then
        echo "강제 종료 중..."
        echo "$REMAINING" | xargs kill -9
    fi

    echo "Gunicorn 시작 중..."
    cd /home/lvdkorea/webtranet/backend
    source venv/bin/activate
    nohup gunicorn --config gunicorn.conf.py run:app > logs/gunicorn_manual.log 2>&1 &

    sleep 2

    if ps aux | grep gunicorn | grep -v grep > /dev/null; then
        echo "✅ Gunicorn이 재시작되었습니다."
    else
        echo "❌ Gunicorn 시작 실패!"
        exit 1
    fi
fi

echo ""
echo "🎉 재시작 완료!"
