# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/app/package.json apps/app/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS builder
COPY apps/app apps/app
COPY packages/ui packages/ui
COPY packages/types packages/types
COPY packages/config packages/config
RUN pnpm --filter @cvforge/app build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /workspace
RUN corepack enable
ENV NODE_ENV=production

COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /workspace/turbo.json ./turbo.json
COPY --from=builder /workspace/apps/app/package.json ./apps/app/package.json
COPY --from=builder /workspace/packages/ui/package.json ./packages/ui/package.json
COPY --from=builder /workspace/packages/types/package.json ./packages/types/package.json
COPY --from=builder /workspace/packages/config/package.json ./packages/config/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /workspace/apps/app/.next ./apps/app/.next
COPY --from=builder /workspace/packages/ui ./packages/ui
COPY --from=builder /workspace/packages/types ./packages/types
COPY --from=builder /workspace/packages/config ./packages/config

EXPOSE 3000

CMD ["pnpm", "--filter", "@cvforge/app", "start"]
