#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/web/dist"
TARGETS_FILE="${HERDR_WEB_DEPLOY_TARGETS_FILE:-$ROOT_DIR/.deploy-web-targets}"

if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "web/dist is missing; run npm run build:web first" >&2
  exit 1
fi
if [[ ! -f "$TARGETS_FILE" ]]; then
  echo "deployment target file not found: $TARGETS_FILE" >&2
  exit 1
fi

local_hash="$(sha256sum "$DIST_DIR/index.html" | awk '{print $1}')"
target_count=0

while IFS='|' read -r kind host port target_path served_url; do
  [[ -z "$kind" || "$kind" == \#* ]] && continue
  target_count=$((target_count + 1))

  if [[ "$target_path" != */share/herdr-web/web ]]; then
    echo "refusing unexpected deployment path: $target_path" >&2
    exit 1
  fi
  if [[ -z "$served_url" ]]; then
    echo "served URL is required for target: $target_path" >&2
    exit 1
  fi

  case "$kind" in
    local)
      rsync -a --delay-updates --delete-delay "$DIST_DIR/" "$target_path/"
      ;;
    ssh)
      if [[ -z "$host" || -z "$port" ]]; then
        echo "SSH host and port are required for target: $target_path" >&2
        exit 1
      fi
      rsync -a --delay-updates --delete-delay \
        -e "ssh -p $port -o BatchMode=yes" "$DIST_DIR/" "$host:$target_path/"
      ;;
    *)
      echo "unsupported deployment target kind: $kind" >&2
      exit 1
      ;;
  esac

  served_hash="$(curl -fsS "${served_url%/}/" | sha256sum | awk '{print $1}')"
  if [[ "$served_hash" != "$local_hash" ]]; then
    echo "served index hash mismatch for $served_url" >&2
    exit 1
  fi
  echo "deployed $served_url ($served_hash)"
done < "$TARGETS_FILE"

if [[ "$target_count" -eq 0 ]]; then
  echo "deployment target file contains no targets: $TARGETS_FILE" >&2
  exit 1
fi
