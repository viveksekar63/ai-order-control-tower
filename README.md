# AI Order Control Tower

Step 1 foundation for an AI-assisted production order operations and RCA platform.

## Stack
- NestJS + TypeScript
- Prisma + PostgreSQL
- Redis
- RabbitMQ
- Next.js admin (to be implemented next)

## Start infrastructure
```bash
docker compose up -d
```

## Backend setup
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init_control_tower
npm run start:dev
```

API base: `http://localhost:4000/api`

RabbitMQ UI: `http://localhost:15673`

## Step 1 scope
1. Order master and lifecycle state
2. Immutable order event history
3. State transition history
4. Exception management
5. Controlled operational actions
6. AI diagnosis/evidence/recommendations
7. Integration health
8. System metrics
9. PHP-FPM process/memory metrics
10. Alerting and audit trail

## Design principle
Deterministic event/state/exception processing comes before AI diagnosis. AI receives evidence from the Control Tower and explains probable causes/recommendations; it does not become the source of truth for order state.
