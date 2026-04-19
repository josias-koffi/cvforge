FROM node:20-alpine

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/types packages/types
COPY packages/config packages/config

EXPOSE 3333

CMD ["pnpm", "--filter", "@cvforge/api", "dev"]
