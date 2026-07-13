#!/bin/bash
# Runs ON THE SERVER (triggered over SSH by .github/workflows/deploy-worker.yml).
# Rebuilds and restarts the worker container from whatever is on origin/main.
# Secrets (env file, keypair) live outside the repo on the server and are never
# touched here — see docs/operations/worker-deploy.md.
set -euo pipefail

cd ~/daze
git fetch origin main
git reset --hard origin/main

sudo docker build -f apps/worker/Dockerfile -t daze-worker:latest .

sudo docker rm -f daze-worker >/dev/null 2>&1 || true
sudo docker run -d \
  --name daze-worker \
  --restart unless-stopped \
  --env-file /home/ubuntu/daze-worker.env \
  -v /home/ubuntu/keypair.json:/app/keypair.json:ro \
  daze-worker:latest

sudo docker image prune -f >/dev/null

echo "Deployed $(git rev-parse --short HEAD)."
sleep 3
sudo docker logs daze-worker --tail 15
