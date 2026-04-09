#!/bin/bash
# Webtranet DB 주간 백업 스크립트
# 매주 일요일 cron으로 실행

PROJECT_ROOT="/home/jhi/webtranet"
BACKUP_DIR="$PROJECT_ROOT/db_backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_WEEKS=8  # 8주치 보관

mkdir -p "$BACKUP_DIR"

echo "[$(date)] DB 백업 시작"

# 세 DB 백업
for DB in \
    "backend/app/database/user.db" \
    "backend/app/database/webtranet.db" \
    "backend/instance/jsharp.db"
do
    SRC="$PROJECT_ROOT/$DB"
    FILENAME="$(basename $DB .db)_${DATE}.db"
    DEST="$BACKUP_DIR/$FILENAME"

    if [ -f "$SRC" ]; then
        sqlite3 "$SRC" ".backup '$DEST'"
        echo "  ✓ $FILENAME"
    else
        echo "  ⚠ 파일 없음: $SRC"
    fi
done

# 8주 이상 된 백업 삭제
find "$BACKUP_DIR" -name "*.db" -mtime +$((KEEP_WEEKS * 7)) -delete
echo "[$(date)] 오래된 백업 정리 완료 (${KEEP_WEEKS}주 초과분 삭제)"

echo "[$(date)] DB 백업 완료"
