#!/usr/bin/env bash
set -euo pipefail

PLATYPUS_PKG="${PLATYPUS_PKG:-platypus-cli}"
PLATYPUS_VERSION="${PLATYPUS_VERSION:-latest}"
PLATYPUS_HOME="${PLATYPUS_HOME:-$HOME/.platypus}"

detect_install_dir() {
  if [[ -n "${PLATYPUS_INSTALL_DIR:-}" ]]; then
    echo "${PLATYPUS_INSTALL_DIR}"
    return 0
  fi
  if [[ -n "${XDG_BIN_DIR:-}" ]]; then
    echo "${XDG_BIN_DIR}"
    return 0
  fi
  if [[ -d "$HOME/bin" ]]; then
    echo "$HOME/bin"
    return 0
  fi
  if mkdir -p "$HOME/bin" 2>/dev/null; then
    echo "$HOME/bin"
    return 0
  fi
  echo "$HOME/.platypus/bin"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Error: missing dependency: $1" >&2
    exit 1
  }
}

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$os" in
  darwin|linux) ;;
  *)
    echo "Error: unsupported OS: $(uname -s). Use: npm i -g ${PLATYPUS_PKG}@latest" >&2
    exit 1
    ;;
esac

need_cmd node
need_cmd npm

install_dir="$(detect_install_dir)"
mkdir -p "$install_dir"
mkdir -p "$PLATYPUS_HOME"

install_spec="$PLATYPUS_PKG"
if [[ "$install_spec" != *":"* && "$install_spec" != */* && "$install_spec" != *.tgz && "$install_spec" != *.tar.gz ]]; then
  install_spec="${install_spec}@${PLATYPUS_VERSION}"
fi

echo "Installing ${install_spec} into ${PLATYPUS_HOME} ..."
npm install --silent --no-progress --prefix "$PLATYPUS_HOME" "${install_spec}"

bin_src="$PLATYPUS_HOME/node_modules/.bin/platypus"
bin_dst="$install_dir/platypus"

if [[ ! -e "$bin_src" ]]; then
  echo "Error: expected binary not found at: $bin_src" >&2
  exit 1
fi

ln -sf "$bin_src" "$bin_dst" 2>/dev/null || true
if [[ ! -x "$bin_dst" ]]; then
  cat >"$bin_dst" <<EOF
#!/usr/bin/env bash
exec "$bin_src" "\$@"
EOF
  chmod +x "$bin_dst"
fi

echo "Installed: $bin_dst"
if [[ ":$PATH:" != *":$install_dir:"* ]]; then
  echo "Add to PATH (example):"
  echo "  export PATH=\"$install_dir:\$PATH\""
fi
echo "Run:"
echo "  platypus"
