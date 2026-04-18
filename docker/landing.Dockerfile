FROM node:20-alpine

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json

EXPOSE 3001

CMD ["sh", "-lc", "echo 'Install dependencies with pnpm before starting the landing container.' && sleep infinity"]
