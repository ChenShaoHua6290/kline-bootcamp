FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm --prefix apps/api run prisma:generate:pg
RUN npm --prefix apps/api run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/src/main.js"]
