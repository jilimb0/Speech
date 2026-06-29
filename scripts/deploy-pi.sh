#!/usr/bin/env bash
set -euo pipefail

cd /home/jilimbo/Documents/PersonalProjects/Speech
git pull origin master
docker compose up -d --build
docker system prune -f
