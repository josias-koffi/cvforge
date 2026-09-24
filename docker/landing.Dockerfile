# CVSpark landing site (Next.js standalone output)

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile --filter @cvforge/landing...

# Stage 2: Build
FROM deps AS builder
# Canonical URLs, sitemap and OG images are baked in at build time.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3101
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY apps/landing apps/landing
COPY packages/types packages/types
COPY packages/config packages/config
# @cvforge/types resolves to dist/index.js and its dist/ is not committed, so it
# has to be built before anything that imports it.
RUN pnpm --filter @cvforge/types build
RUN pnpm --filter @cvforge/landing build

# Stage 3: Minimal runtime
FROM node:20-alpine AS runner
WORKDIR /workspace
# APP_URL is read per request by /login, so it stays a runtime variable.
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3001
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /workspace/apps/landing/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/landing/public ./apps/landing/public

USER nextjs
EXPOSE 3001

CMD ["node", "apps/landing/server.js"]
