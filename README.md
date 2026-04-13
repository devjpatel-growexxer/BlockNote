# BlockNote Editor

Production-grade block editor built with a React frontend, REST API backend, and PostgreSQL.

## Current Status

Step 1 complete:
- Monorepo workspace structure created
- Shared constants/config package added
- Next.js app shell added
- Express API shell added
- `.env.example` created

Step 2 complete:
- PostgreSQL migration system added
- Initial schema and indexes added
- Local database connection pool added
- API database health check added
- Local PostgreSQL setup instructions documented

## Planned Stack

- Frontend: Next.js + React
- Backend: Express REST API
- Database: PostgreSQL with parameterized queries via `pg`
- Deployment: Local PostgreSQL for development, cloud deployment later

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Start or install a local PostgreSQL server
4. Create the `blocknote` database
5. Run `npm run db:migrate`
6. Start the frontend with `npm run dev:web`
7. Start the API with `npm run dev:api`

## Local PostgreSQL Setup

Your machine already has the `psql` client installed. The missing part is a running PostgreSQL server.

Ubuntu or Debian:
1. Install the server if needed: `sudo apt update && sudo apt install postgresql postgresql-contrib`
2. Start PostgreSQL: `sudo systemctl start postgresql`
3. Enable it on boot: `sudo systemctl enable postgresql`
4. Create the database: `createdb -U postgres blocknote`

Recommended `.env` values for local development:

```env
DATABASE_URL=postgres://postgres:your_password@localhost:5432/blocknote
DATABASE_SSL=false
```

Useful checks:
- `pg_isready`
- `npm run db:status`
- `psql postgres://postgres:your_password@localhost:5432/blocknote -c "select now();"`

Schema management:
- SQL migrations live in `infra/migrations`
- Apply them with `npm run db:migrate`
- The app uses `pg` directly with parameterized queries, not an ORM

Current rollback strategy:
- Migration rollbacks are manual in v1
- Each future migration should document its rollback steps explicitly

## Notes

- No block editor libraries will be used.
- The editor will be built with `contentEditable` and custom interaction logic.
- AI usage must be logged in `AI_LOG.md`.
