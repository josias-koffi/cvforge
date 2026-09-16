# CVForge v2 web app (Next.js standalone output)

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/document-renderer/package.json packages/document-renderer/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile --filter @cvforge/web...

# Stage 2: Build
FROM deps AS builder
COPY apps/web apps/web
COPY packages/document-renderer packages/document-renderer
COPY packages/types packages/types
COPY packages/config packages/config
# @cvforge/types resolves to dist/index.js and its dist/ is not committed, so it
# has to be built before anything that imports it.
RUN pnpm --filter @cvforge/types build
RUN pnpm --filter @cvforge/document-renderer build
RUN pnpm --filter @cvforge/web build

# Stage 3: Minimal runtime
FROM node:20-alpine AS runner
WORKDIR /workspace
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3100
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3100

CMD ["node", "apps/web/server.js"]
