FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_ICP_NO
ARG NEXT_PUBLIC_ICP_LINK
ARG NEXT_PUBLIC_PSB_NO
ARG NEXT_PUBLIC_PSB_LINK
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}
ENV NEXT_PUBLIC_ICP_NO=${NEXT_PUBLIC_ICP_NO}
ENV NEXT_PUBLIC_ICP_LINK=${NEXT_PUBLIC_ICP_LINK}
ENV NEXT_PUBLIC_PSB_NO=${NEXT_PUBLIC_PSB_NO}
ENV NEXT_PUBLIC_PSB_LINK=${NEXT_PUBLIC_PSB_LINK}

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --legacy-peer-deps
RUN npm --prefix apps/web install --legacy-peer-deps

COPY . .
RUN npm --prefix apps/web run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV WEB_PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.js ./apps/web/next.config.js
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000
USER nextjs
CMD ["npm", "--prefix", "apps/web", "run", "start"]
