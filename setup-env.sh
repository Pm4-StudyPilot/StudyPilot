#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

copy_env() {
  local src="$1"
  local dest="$2"

  if [ -f "$dest" ]; then
    read -rp "$dest already exists. Overwrite? [y/N] " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
      echo "  Skipped $dest"
      return
    fi
  fi

  cp "$src" "$dest"
  echo "  Created $dest"
}

echo "Setting up environment files..."
echo ""

copy_env "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
copy_env "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"

echo ""
echo "Done. Review the .env files and adjust values as needed."
