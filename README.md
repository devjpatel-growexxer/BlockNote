# BlockNote Editor

Production-grade block editor built with a React frontend, REST API backend, and PostgreSQL.

## Current Status

Step 1 complete:
- Monorepo workspace structure created
- Shared constants/config package added
- Next.js app shell added
- Express API shell added
- `.env.example` created

## Planned Stack

- Frontend: Next.js + React
- Backend: Express REST API
- Database: PostgreSQL with parameterized queries via `pg`
- Deployment: Render + Neon

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Start the frontend with `npm run dev:web`
4. Start the API with `npm run dev:api`

## Notes

- No block editor libraries will be used.
- The editor will be built with `contentEditable` and custom interaction logic.
- AI usage must be logged in `AI_LOG.md`.
