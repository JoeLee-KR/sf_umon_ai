#!/bin/bash
set -euo pipefail

# 1. 작업 기준 루트 디렉터리 정의 및 강제 이동
TARGET_DIR="$HOME/codes/sf_umon_ai"

if [ ! -d "$TARGET_DIR" ]; then
  echo "[ERROR] 대상 디렉터리가 존재하지 않습니다: $TARGET_DIR" >&2
  exit 1
fi

cd "$TARGET_DIR"

# 2. 원본 검증
SRC_DIR="apps/web"
if [ ! -d "$SRC_DIR" ]; then
  echo "[ERROR] 원본 디렉터리가 존재하지 않습니다: $TARGET_DIR/$SRC_DIR" >&2
  exit 1
fi

# 3. 오늘 날짜(YYMMDD) 기반 백업 디렉터리 경로 생성
DATE_TAG=$(date +"%y%m%d")
DEST_DIR="apps/web_${DATE_TAG}"

# 4. 동일 날짜 디렉터리가 이미 존재할 경우 완전 삭제 후 재생성
if [ -d "$DEST_DIR" ]; then
  echo "[INFO] 오늘자 백업(${DEST_DIR})이 이미 존재하여 기존 본을 삭제합니다..."
  rm -rf "$DEST_DIR"
fi

mkdir -p "$DEST_DIR"

# 5. rsync 동기화 실행
echo "[INFO] 백업을 시작합니다: $SRC_DIR -> $DEST_DIR"
rsync -a \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.turbo' \
  "$SRC_DIR/" "$DEST_DIR/"

echo "[SUCCESS] 백업 완료: $(pwd)/$DEST_DIR"
