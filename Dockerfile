FROM node:26-alpine AS builder
RUN npm install -g pnpm@11.0.9

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY services/analysis/package.json services/analysis/
COPY services/speech/package.json services/speech/
COPY services/sessions/package.json services/sessions/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY services/analysis/ services/analysis/
COPY services/speech/ services/speech/
COPY services/sessions/ services/sessions/
COPY apps/api/ apps/api/

RUN pnpm --filter @speech/shared build
RUN pnpm --filter @speech/analysis build
RUN pnpm --filter @speech/sessions build
RUN pnpm --filter @speech/speech build
RUN pnpm --filter @speech/api build

FROM node:26-alpine
WORKDIR /app

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/packages packages
COPY --from=builder /app/services services
COPY --from=builder /app/apps apps

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
