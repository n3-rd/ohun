#!/usr/bin/env bash
set -e
APP_NAME="ohun"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/../src-tauri/target"

if [[ "$(uname)" != Darwin ]]; then
  echo "macOS only, skipping"
  exit 0
fi

# Find the .app — could be under target/<triple>/release or target/release
APP_PATH=$(find "$TARGET_DIR" -path "*/release/bundle/macos/${APP_NAME}.app" -type d 2>/dev/null | head -1)

if [[ -z "$APP_PATH" ]]; then
  echo "App not found under $TARGET_DIR — run 'pnpm tauri build' first"
  exit 1
fi

echo "Ad-hoc signing $APP_PATH"
xattr -cr "$APP_PATH"
codesign -s - --force --deep "$APP_PATH"
echo "Done. Users can right-click → Open to launch."
