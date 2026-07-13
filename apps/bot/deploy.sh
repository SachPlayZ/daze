#!/bin/bash
# Runs ON THE SERVER (triggered over SSH by .github/workflows/deploy-bot.yml).
# Rebuilds and restarts the bot container from whatever is on origin/main.
# Secrets (env file) live outside the repo on the server and are never touched here.
set -euo pipefail

cd ~/daze
git fetch origin main
git reset --hard origin/main

sudo docker build -f apps/bot/Dockerfile -t daze-bot:latest .

sudo docker rm -f daze-bot >/dev/null 2>&1 || true
sudo docker run -d \
  --name daze-bot \
  --restart unless-stopped \
  --env-file /home/ubuntu/daze-bot.env \
  daze-bot:latest

sudo docker image prune -f >/dev/null

echo "Deployed $(git rev-parse --short HEAD)."
sleep 3
sudo docker logs daze-bot --tail 15
