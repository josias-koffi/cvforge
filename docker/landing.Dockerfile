FROM node:20-alpine

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json

RUN pnpm install --frozen-lockfile

COPY apps/landing apps/landing
COPY packages/ui packages/ui
COPY packages/types packages/types
COPY packages/config packages/config

EXPOSE 3001

CMD ["pnpm", "--filter", "@cvforge/landing", "dev"]
