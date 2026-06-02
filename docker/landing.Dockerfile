# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS builder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=http://localhost:3333
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY apps/landing apps/landing
COPY packages/ui packages/ui
COPY packages/types packages/types
COPY packages/config packages/config
RUN pnpm --filter @cvforge/landing build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /workspace
RUN corepack enable
ENV NODE_ENV=production

COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /workspace/turbo.json ./turbo.json
COPY --from=builder /workspace/apps/landing/package.json ./apps/landing/package.json
COPY --from=builder /workspace/packages/ui/package.json ./packages/ui/package.json
COPY --from=builder /workspace/packages/types/package.json ./packages/types/package.json
COPY --from=builder /workspace/packages/config/package.json ./packages/config/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /workspace/apps/landing/.next ./apps/landing/.next
COPY --from=builder /workspace/packages/ui ./packages/ui
COPY --from=builder /workspace/packages/types ./packages/types
COPY --from=builder /workspace/packages/config ./packages/config

EXPOSE 3001

CMD ["pnpm", "--filter", "@cvforge/landing", "start"]
