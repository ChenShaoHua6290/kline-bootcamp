# Kline Blind Training MVP

## Quick Start

1. Install dependencies
```bash
npm install
```

2. Backend env (`apps/api/.env`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kline"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret"
```

3. Prisma
```bash
npm run prisma:generate -w @kline/api
# then run prisma migrate in your own environment
```

4. Run
```bash
npm run dev:api
npm run dev:web
```

- API: http://localhost:4000
- Web: http://localhost:3000
