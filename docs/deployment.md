# Deployment

## Local (recommended for development)

1. Copy `.env.example` to `.env`.
2. `docker compose up -d postgres`
3. `npm install`
4. `npm run db:migrate && npm run db:seed` (from repo root, or inside `backend`)
5. `npm run dev:backend` and `npm run dev:frontend`

## Docker full stack

```bash
docker compose up --build
```

- API: http://localhost:4000
- Web (nginx): http://localhost:8080
- Postgres: localhost:5433

Replace JWT secrets before any shared environment.

## Production considerations

- Use managed PostgreSQL; run `prisma migrate deploy`.
- Set strong unique `JWT_SECRET` / `JWT_REFRESH_SECRET`.
- Terminate TLS at a reverse proxy; set `CLIENT_URL` to the real origin.
- Switch `STORAGE_PROVIDER=S3` and supply bucket credentials.
- Set `AI_PROVIDER=OPENAI` only if a server-side key is available.
- Do not expose Prisma, `.env`, or upload directories publicly.
- Run the SLA job as a single replica or use a distributed lock if scaling API instances.
- Configure CORS to the production frontend origin only.
- Ship structured logs; never return stack traces (`NODE_ENV=production`).
- Rotate demo users / seed data — seed is not for production.
