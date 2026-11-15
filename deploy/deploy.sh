#!/usr/bin/env bash
# Sends the current files of the project to the VPS and starts the new version.
# Usage: ./deploy/deploy.sh [ssh target, default root@hostinger]
#
# The script sends the files that git knows (committed or staged), so build output
# and node_modules stay on your machine. The app keeps no data: a deploy starts with all sensors at the calm value.
set -euo pipefail

target="${1:-root@hostinger}"
app_dir=/root/apps/nexxo
cd "$(dirname "$0")/.."

ssh "$target" "mkdir -p $app_dir"
# Remove old source files on the VPS, but keep a .env file if one is there.
ssh "$target" "find $app_dir -mindepth 1 -maxdepth 1 ! -name .env -exec rm -rf {} +"
git ls-files -z | tar --null -T - -czf - | ssh "$target" "tar -xzf - -C $app_dir"
ssh "$target" "cd $app_dir && docker compose -f deploy/compose.yml up -d --build && docker image prune -f >/dev/null"
ssh "$target" "curl -fsS --retry 15 --retry-all-errors --retry-delay 1 http://127.0.0.1:8085/api/helmet >/dev/null && echo 'Nexxo answers on the VPS.'"
