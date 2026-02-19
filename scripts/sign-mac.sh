#!/usr/bin/env bash
# Ad-hoc sign macOS .app so Gatekeeper shows "unidentified developer" instead of "damaged"
# Run after: pnpm tauri build
set -e
APP_NAME="ohun"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="${SCRIPT_DIR}/../src-tauri/target/release/bundle/macos/${APP_NAME}.app"
if [[ "$(uname)" != Darwin ]]; then
  echo "macOS only, skipping"
  exit 0
fi
if [[ ! -d "$APP_PATH" ]]; then
  echo "App not found at $APP_PATH — run 'pnpm tauri build' first"
  exit 1
fi
echo "Ad-hoc signing $APP_PATH"
xattr -cr "$APP_PATH"
codesign -s - --force --deep "$APP_PATH"
echo "Done. Users can right-click → Open to launch."
