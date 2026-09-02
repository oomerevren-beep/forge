#!/bin/sh
# Forge installer — curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
# or: FORGE_VERSION=0.1.0 sh install.sh
set -e
REPO="oomerevren-beep/forge"
VERSION="${FORGE_VERSION:-0.1.1}"

echo "[forge] installer — $REPO@$VERSION"

if command -v npm >/dev/null 2>&1; then
  echo "[forge] installing via npm..."
  npm i -g tryforge
  echo "[forge] ✓ installed via npm — run 'forge doctor' to verify (also available as 'tryforge')"
  if ! command -v forge >/dev/null 2>&1 && ! command -v tryforge >/dev/null 2>&1; then
    echo "[forge] note: add npm global bin to PATH: $(npm bin -g 2>/dev/null || echo '~/.npm-global/bin')"
  fi
  exit 0
fi

if command -v curl >/dev/null 2>&1; then
  URL="https://github.com/$REPO/releases/download/v$VERSION/forge-v$VERSION-linux-x64.tar.gz"
  echo "[forge] npm not found, trying $URL ..."
  if curl -fsSL "$URL" -o /tmp/forge.tar.gz 2>/dev/null; then
    mkdir -p "$HOME/.forge/bin"
    tar -xzf /tmp/forge.tar.gz -C "$HOME/.forge/bin" 2>/dev/null || true
    echo "[forge] ✓ extracted to ~/.forge/bin — add to PATH: export PATH=\$HOME/.forge/bin:\$PATH"
    exit 0
  fi
fi

echo "[forge] npm not found — please install Node.js 18+ from https://nodejs.org"
echo "[forge] then rerun: npm i -g tryforge"
exit 1
