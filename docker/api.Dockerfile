# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/document-renderer/package.json packages/document-renderer/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS builder
COPY apps/api apps/api
COPY packages/document-renderer packages/document-renderer
COPY packages/types packages/types
COPY packages/config packages/config
RUN pnpm --filter @cvforge/types build
RUN pnpm --filter @cvforge/document-renderer build
RUN pnpm --filter @cvforge/api build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /workspace
RUN corepack enable
ENV NODE_ENV=production

COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /workspace/turbo.json ./turbo.json
COPY --from=builder /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder /workspace/packages/document-renderer/package.json ./packages/document-renderer/package.json
COPY --from=builder /workspace/packages/types/package.json ./packages/types/package.json
COPY --from=builder /workspace/packages/config/package.json ./packages/config/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder /workspace/packages/document-renderer/dist ./packages/document-renderer/dist
COPY --from=builder /workspace/packages/types/dist ./packages/types/dist

EXPOSE 3333

CMD ["node", "apps/api/dist/apps/api/src/main.js"]
