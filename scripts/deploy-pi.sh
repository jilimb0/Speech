#!/usr/bin/env bash
set -euo pipefail

cd /home/jilimb0/Documents/PersonalProjects/Speech
git fetch origin master -q
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
API_RUNNING=$(docker ps -q -f name=speech-api-1 || true)

if [ "$LOCAL" != "$REMOTE" ] || [ -z "$API_RUNNING" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploying Speech update ($LOCAL -> $REMOTE, container running: ${API_RUNNING:-no})"
  git merge --ff-only origin/master
  docker compose up -d --build
  docker system prune -f
fi
