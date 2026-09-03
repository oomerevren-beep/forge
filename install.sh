#!/bin/sh
# Forge installer — curl -fsSL https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.sh | sh
# or: FORGE_VERSION=0.1.1 sh install.sh
set -e
REPO="oomerevren-beep/forge"
VERSION="${FORGE_VERSION:-0.1.1}"

echo "[forge] installer — $REPO@$VERSION"

print_path_help() {
  # $1 = missing command name for the message
  echo "[forge] '$1' is installed but not on your PATH. Fix in 2 steps:"
  echo "[forge]   1. Find npm's global bin: npm prefix -g  (append /bin)"
  echo "[forge]   2. Add it to PATH, e.g.: export PATH=\"\$(npm prefix -g)/bin:\$PATH\""
  echo "[forge]      then restart your shell and run: forge doctor"
}

if command -v npm >/dev/null 2>&1; then
  echo "[forge] installing via npm..."
  if npm i -g tryforge; then
    if command -v forge >/dev/null 2>&1; then
      echo "[forge] ✓ installed via npm — run 'forge doctor' to verify (also available as 'tryforge')"
      exit 0
    fi
    if command -v tryforge >/dev/null 2>&1; then
      echo "[forge] ✓ installed via npm as 'tryforge' — run 'tryforge doctor' to verify"
      echo "[forge] note: the 'forge' alias is not on PATH; 'tryforge' works everywhere."
      exit 0
    fi
    print_path_help "forge"
    exit 1
  fi
  echo "[forge] npm install failed (see error above). Fix npm first, then rerun this script."
  exit 1
fi

# No npm: try a prebuilt binary asset (published per GitHub Release).
OS="$(uname -s 2>/dev/null || echo unknown)"
ARCH="$(uname -m 2>/dev/null || echo unknown)"
case "$OS" in
  Linux) PLAT="linux" ;;
  Darwin) PLAT="darwin" ;;
  *) echo "[forge] no npm and unsupported OS for binary fallback: $OS ($ARCH)"; PLAT="" ;;
esac
case "$ARCH" in
  x86_64|amd64) ARCHN="x64" ;;
  arm64|aarch64) ARCHN="arm64" ;;
  *) echo "[forge] no npm and unsupported arch for binary fallback: $ARCH"; ARCHN="" ;;
esac

if [ -n "$PLAT" ] && [ -n "$ARCHN" ]; then
  URL="https://github.com/$REPO/releases/download/v$VERSION/forge-v$VERSION-$PLAT-$ARCHN.tar.gz"
  echo "[forge] npm not found, trying $URL ..."
  if curl -fsSL "$URL" -o /tmp/forge.tar.gz; then
    if [ ! -s /tmp/forge.tar.gz ]; then
      echo "[forge] download is empty — the release asset may not exist yet."
    else
      mkdir -p "$HOME/.forge/bin"
      if tar -xzf /tmp/forge.tar.gz -C "$HOME/.forge/bin"; then
        BIN="$HOME/.forge/bin/forge"
        if [ -x "$BIN" ]; then
          echo "[forge] ✓ extracted to $HOME/.forge/bin"
          echo "[forge] REQUIRED: add it to PATH: export PATH=\"\$HOME/.forge/bin:\$PATH\""
          echo "[forge] then restart your shell and run: forge doctor"
          exit 0
        fi
        echo "[forge] extraction succeeded but no executable at $BIN — asset layout unexpected."
      else
        echo "[forge] extraction failed — the downloaded asset may be corrupt."
      fi
    fi
  else
    echo "[forge] download failed — no binary asset for $PLAT-$ARCHN at v$VERSION (or no network)."
  fi
fi

echo "[forge] could not install automatically. Do this instead:"
echo "[forge]   1. Install Node.js 18+ from https://nodejs.org (npm comes with it)"
echo "[forge]   2. Restart your shell, then run: npm i -g tryforge"
echo "[forge]   3. Verify with: forge doctor"
exit 1
