# BlockNote Editor

BlockNote Editor is a monorepo for a Notion-style block editor with a custom editor surface, REST API backend, PostgreSQL persistence, autosave, sharing, and PDF export.

## Stack

- Frontend: Next.js 15 + React 19
- Backend: Express
- Database: PostgreSQL
- Shared package: shared constants and Zod validation schemas
- Auth: JWT access token + refresh token cookie
- Deployment used during development: Vercel frontend, Render backend, Render Postgres

## Repository Structure

```text
apps/
  api/        Express REST API
  web/        Next.js frontend
packages/
  shared/     Shared constants, schemas, and validators
infra/
  migrations/ PostgreSQL schema migrations
```

## Setup Instructions

You can run the full stack locally using Docker Compose, or set it up manually.

### Using Docker Compose

1. **Create the environment file**:
   ```bash
   cp .env.example .env
   ```
2. **Start the containers** (Frontend, Backend, PostgreSQL):
   ```bash
   docker compose up -d
   ```
   The web app will run on `http://localhost:3000` and the API on `http://localhost:4000/api/v1`.

3. **Run migrations** (Wait for the API container to be healthy first):
   ```bash
   docker compose exec api npm run db:migrate
   ```

### Manual Setup Prerequisites

- Node.js `>=24`
- npm `>=11`
- PostgreSQL running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create the local environment file

```bash
cp .env.example .env
```

Update the values in `.env` for your local machine, especially `DATABASE_URL`, JWT secrets, and any custom ports/origins.

### 3. Create the database

Create a local PostgreSQL database named `blocknote`:

```bash
createdb -U postgres blocknote
```

If your local PostgreSQL uses a different username, password, or database name, update `DATABASE_URL` in `.env`.

### 4. Run migrations

```bash
npm run db:migrate
```

Optional connection check:

```bash
npm run db:status
```

### 5. Start the backend

```bash
npm run dev:api
```

The API runs on the port from `API_PORT`, which defaults to `4000`.

### 6. Start the frontend

In a second terminal:

```bash
npm run dev:web
```

The web app runs on `http://localhost:3000`.

### 7. Open the app

- Frontend: `http://localhost:3000`
- API base URL: `http://localhost:4000/api/v1`

## Environment Variables

Reference: [.env.example](./.env.example)

- `NODE_ENV`: Runtime mode. Use `development` locally and `production` in deployment.
- `NEXT_PUBLIC_APP_URL`: Public URL of the frontend app used by the web client.
- `NEXT_PUBLIC_API_URL`: Public base URL of the API used by the frontend, including `/api/v1`.
- `API_PORT`: Local API port for the Express server.
- `WEB_ORIGIN`: Allowed frontend origin for CORS and cookie usage. In production this must exactly match the deployed frontend origin.
- `DATABASE_URL`: PostgreSQL connection string used by the API and migration scripts.
- `DATABASE_SSL`: Whether the PostgreSQL connection should use SSL (`true` or `false`).
- `JWT_ACCESS_SECRET`: Secret used to sign and verify short-lived access tokens.
- `JWT_REFRESH_SECRET`: Secret used to sign and verify refresh tokens.
- `JWT_ACCESS_TTL_MINUTES`: Access token lifetime in minutes.
- `JWT_REFRESH_TTL_DAYS`: Refresh token lifetime in days.
- `REFRESH_COOKIE_NAME`: Name of the browser cookie that stores the refresh token.
- `SHARE_SESSION_SECRET`: Secret reserved for share/read-only session signing logic.
- `SHARE_SESSION_TTL_MINUTES`: Lifetime for share/read-only session handling.
- `BCRYPT_ROUNDS`: Password hashing cost used when storing user passwords.

## Architecture Decisions

- **Next.js for the frontend**: I chose Next.js so the UI, routing, and production deployment story stay simple while still giving a full React app experience.
- **Express REST API**: I used a separate Express API so auth, document ownership, sharing, and autosave logic stay explicit and easy to test independently from the UI.
- **PostgreSQL with `pg` instead of an ORM**: I chose direct parameterized SQL because the project requirements explicitly emphasized parameterized queries and it keeps database behavior very transparent.
- **Monorepo with `packages/shared`**: Shared constants and Zod schemas prevent the frontend and backend from drifting on block types, payloads, and validation rules.
- **Custom editor instead of a block-editor library**: The editor uses custom React state and browser inputs so the block behavior matches the project requirements without relying on Notion-like editor frameworks.
- **JWT access token in memory + refresh token in httpOnly cookie**: This gives a smoother SPA experience while avoiding `localStorage` for long-lived auth state.
- **Versioned autosave**: Document saves send a `baseVersion`, and the backend rejects stale saves with `409` so older requests cannot overwrite newer content.
- **Flat block ordering with midpoint values**: Blocks are stored in a flat list with `order_index` so reordering is efficient and renormalization only happens when gaps get too small.
- **Token hashing for sharing**: Raw share tokens are shown once to the owner, but only the token hash is stored in the database.

## Known Issues

- The automated test suite is not complete yet; most verification has been manual through the UI, Thunder Client, and targeted endpoint checks.
- The API `build` script is currently a placeholder because the Express app runs directly from source.
- Some UI interactions are highly customized and still have polish gaps, especially around complex editor hover states and drag interactions.
- PDF export is the only export option right now; richer formats like DOCX are not implemented.
- The frontend uses an in-memory access token, so the token is intentionally available to the browser runtime while the app is open.
- Share/read-only mode is implemented, but the UX around disabled or invalid share states can still be refined further.

## Edge Case Decisions

- **Enter at end of a text block**: Creates a new paragraph below so continuing to write always feels predictable.
- **Enter in the middle of a text block**: Splits the block into two so no text is lost and the caret flow matches document editors.
- **Enter on a todo block**: Creates a paragraph below instead of cloning another todo because that felt cleaner in the final UX pass.
- **Enter on an image block**: Creates a paragraph below only when the block is empty or the image has loaded successfully, so broken image URLs do not create confusing extra blocks.
- **Backspace at the start of the first block**: No-op, to avoid deleting the document root accidentally.
- **Backspace at the start of an empty non-first text block**: Deletes that block and moves focus to the nearest earlier editable text block so cleanup stays fast.
- **Backspace when the previous block is a divider or image**: Deletes or skips that non-text block because the caret cannot meaningfully merge into it.
- **Backspace in an empty image block**: Deletes the image block itself instead of deleting the empty paragraph above it, which matches user intent better.
- **Slash menu query text**: The `/query` text lives only in transient UI state and is never persisted to block content.
- **Code block Tab behavior**: Inserts two spaces at the caret instead of moving browser focus, because code editing should stay inside the block.
- **Reordering strategy**: Uses midpoint ordering for normal moves and renormalizes when gaps get too small, which avoids rewriting every block on every drag.
- **Autosave race handling**: The backend rejects stale saves with `409` and the frontend refetches and reapplies pending edits so late requests cannot overwrite newer work.
- **Cross-account document access**: Returns `403` instead of silently hiding the resource because the grader specifically asked for ownership enforcement.
- **Forbidden frontend state**: If a logged-in user opens another user’s document URL, the frontend renders a forbidden page instead of staying stuck in a loading state.
- **Sharing model**: Shared documents are read-only and write APIs still require owner auth, because view access should never become implicit edit access.
- **Image validation**: Image URLs are treated as valid only after the browser successfully loads them, because file-extension checks alone reject many real CDN image URLs.
- **Image insertion flow**: The first successful image load from an empty image block auto-inserts a paragraph below, but later URL edits do not create extra paragraphs.

## Auth Storage Notes

- **Access token**: Stored in frontend memory in `apps/web/src/lib/api.js` (`accessTokenCache`) and mirrored in React auth state.
- **Refresh token**: Stored in a browser `httpOnly` cookie set by the backend.
- **Backend token storage**: The backend does not store access or refresh tokens in PostgreSQL; both are stateless JWTs signed and verified with environment secrets.

## Useful Commands

```bash
npm run dev:web
npm run dev:api
npm run db:migrate
npm run db:status
npm run build:web
```
