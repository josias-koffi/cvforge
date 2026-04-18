FROM node:20-alpine

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json

EXPOSE 3333

CMD ["sh", "-lc", "echo 'Install dependencies with pnpm before starting the api container.' && sleep infinity"]
