#!/bin/bash
# 프론트엔드 배포 스크립트

echo "=== 프론트엔드 빌드 및 배포 ==="
echo ""

# 1. 빌드
echo "1. 프론트엔드 빌드 중..."
cd /home/lvdkorea/webtranet/frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패!"
    exit 1
fi

echo "✅ 빌드 완료"
echo ""

# 2. nginx 디렉토리로 복사
echo "2. nginx 디렉토리로 복사 중..."
sudo cp -r build/* /var/www/webtranet/build/

if [ $? -ne 0 ]; then
    echo "❌ 복사 실패!"
    exit 1
fi

echo "✅ 복사 완료"
echo ""

# 3. 권한 설정
echo "3. 권한 설정 중..."
sudo chown -R www-data:www-data /var/www/webtranet/
sudo chmod -R 755 /var/www/webtranet/

echo "✅ 권한 설정 완료"
echo ""

echo "🎉 배포 완료!"
echo ""
echo "브라우저에서 Ctrl+Shift+R (또는 Cmd+Shift+R)로 하드 리프레시 해주세요."
