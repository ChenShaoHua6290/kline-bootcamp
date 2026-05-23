FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --legacy-peer-deps
RUN npm --prefix apps/web ci --legacy-peer-deps

COPY . .
RUN npm --prefix apps/web run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV WEB_PORT=3000

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000
CMD ["npm", "--prefix", "apps/web", "run", "start"]
