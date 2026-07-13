# Build context is the repo root: docker build -f apps/worker/Dockerfile .
# apps/worker has no build step (tsx runs the TS source directly) but it reaches into
# packages/ and apps/api/src via relative imports (neither has its own package.json —
# pure shared source, no independent install), so the image needs that directory layout
# intact, not just apps/worker/ in isolation.
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /app

# apps/worker is installed independently of the frontend — there is no single workspace
# lockfile in this repo, each app has its own (see apps/worker/pnpm-lock.yaml).
COPY apps/worker/package.json apps/worker/pnpm-lock.yaml ./apps/worker/
WORKDIR /app/apps/worker
RUN pnpm install --frozen-lockfile

WORKDIR /app
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker

WORKDIR /app/apps/worker

COPY apps/worker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "run", "start"]
