#!/usr/bin/env bash
set -eo pipefail

REPO_ROOT="/svc/sf/prod/sf_umon_ai"
APP_DIR="$REPO_ROOT/apps/web"
APP_NAME="sf-web-prod"
TARGET_PORT=3000
TARGET_HOST="127.0.0.1"

echo "=================================================="
echo "[Project] sf_umon_ai"
echo "[CI/CD Pull] Production 배포 파이프라인 가동: $(date '+%Y-%m-%d %H:%M:%S')"
echo "--------------------------------------------------"

# 1. 저장소 루트 이동 및 Git 강제 동기화 (로컬 변형 무시, main 브랜치 일치)
cd "$REPO_ROOT"
echo "[1/5] Git 저장소 원격 최신화 (origin/main 동기화)..."
git fetch origin main
git checkout main
git reset --hard origin/main

# 2. 웹앱 디렉토리 이동 및 의존성 무결성 설치
cd "$APP_DIR"
echo "[2/5] lockfile 기반 의존성 엄격 설치 (npm ci)..."
npm ci --prefer-offline --no-audit

# 3. Next.js 프로덕션 정적/서버 에셋 빌드
echo "[3/5] Next.js 프로덕션 컴파일 (npm run build)..."
npm run build

# 4. PM2 프로세스 무중단 갱신 또는 신규 등록
echo "[4/5] PM2 프로세스 갱신 (Port: $TARGET_PORT)..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  echo "..기존 프로세스($APP_NAME) 재시작 중..."
  pm2 restart "$APP_NAME" --update-env
else
  echo "..신규 프로세스($APP_NAME) 등록 및 기동..."
  pm2 start ./node_modules/.bin/next \
    --name "$APP_NAME" \
    -- start -p "$TARGET_PORT" -H "$TARGET_HOST"
fi

# 5. PM2 상태 덤프 저장
pm2 save

echo "--------------------------------------------------"
echo "✅ Production 배포 완료: http://$TARGET_HOST:$TARGET_PORT"
echo "=================================================="
