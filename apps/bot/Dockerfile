# Build context is the repo root: docker build -f apps/bot/Dockerfile .
# apps/bot has no build step (tsx runs the TS source directly) but it reaches into
# packages/ via relative imports (packages/db, packages/telegram have no package.json
# of their own — pure shared source), so the image needs that directory layout intact.
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /app

# apps/bot is installed independently of the frontend/worker — there is no single
# workspace lockfile in this repo, each app has its own (see apps/bot/pnpm-lock.yaml).
COPY apps/bot/package.json apps/bot/pnpm-lock.yaml ./apps/bot/
WORKDIR /app/apps/bot
RUN pnpm install --frozen-lockfile

WORKDIR /app
COPY packages ./packages
COPY apps/bot ./apps/bot

WORKDIR /app/apps/bot

CMD ["pnpm", "run", "start"]
