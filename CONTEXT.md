# Project Context (BlockNote Editor)

## Purpose
Build a Notion-like block editor with a custom input system (no block editor libraries), REST API backend, and PostgreSQL. The app supports authentication, documents, blocks, sharing (later), and a continuous editor canvas with block behaviors.

## Tech Stack
- Frontend: Next.js (app router), React
- Backend: Express (REST)
- Database: PostgreSQL
- Shared contracts: `packages/shared` with Zod schemas

## Repo Structure
- `apps/web`: frontend (Next.js)
- `apps/api`: backend (Express)
- `packages/shared`: shared constants/schemas
- `infra/migrations`: SQL migrations

## Current Features Implemented
### Auth (Step 3)
- REST endpoints: register, login, refresh, logout, me
- JWT access token, refresh cookie
- Password rules: min 8, 1 number
- Auto refresh on 401, auto logout on refresh failure

### Documents (Step 4)
- CRUD endpoints
- Ownership checks return 403
- New documents create a starter paragraph block

### Blocks (Step 5 + 6 + 7 + 8)
- Block CRUD endpoints
- Block content validation for all 7 types
- Continuous editor canvas (custom input system)
- Core behaviors: Enter split, Backspace delete rules, Tab in code
- Slash menu: `/` at start of empty block opens type picker
- Gap inserters: hover between blocks or at ends to reveal a '+' button to insert directly
- Drag reorder: live, smooth visual shifting during drag, reorder persisted by `/documents/:id/blocks/reorder`

## Editor UX Notes
- Single document canvas, continuous block flow
- Subtle gutter with drag handle + block type badge
- Image block: click image to edit URL (input hidden when valid)
- Auto-growing textareas
- Slash menu for block type changes (`/` at start of empty block)
- Drag reorder with backend persistence via `/documents/:id/blocks/reorder`
- Document shell uses a left sidebar for title, share, and save controls, with a rounded back-to-dashboard button pinned at the bottom
- Floating block bar stays inside the editor canvas and is intentionally separate from the sidebar
- Editor canvas scrolling is handled by the main shell on desktop; on small screens the layout falls back to normal page scrolling
- Save indicator shows Saving/Saved/Failed without toolbar layout shift
- Header and home CTA render skeletons while auth status is restoring, so guest actions do not flash for logged-in users on refresh

## Key Files
### Frontend
- `apps/web/src/components/document-workspace.js`
- `apps/web/src/state/auth-context.js`
- `apps/web/src/lib/api.js`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/login/page.js`
- `apps/web/src/app/register/page.js`
- `apps/web/src/app/dashboard/page.js`
- `apps/web/src/app/documents/[id]/page.js`

### Backend
- `apps/api/src/controllers/auth-controller.js`
- `apps/api/src/controllers/document-controller.js`
- `apps/api/src/controllers/block-controller.js`
- `apps/api/src/services/block-service.js`
- `apps/api/src/repositories/block-repository.js`
- `apps/api/src/utils/db.js`

### Shared
- `packages/shared/src/blocks.js`
- `packages/shared/src/documents.js`
- `packages/shared/src/auth.js`

## API Summary
- Auth: `/api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/me`
- Documents: `/api/v1/documents`, `/documents/:id`
- Versioned save: `PUT /api/v1/documents/:id/content` with `{ baseVersion, blocks[] }`
- Sharing:
  - `POST /api/v1/documents/:id/share`
  - `DELETE /api/v1/documents/:id/share`
  - `GET /api/v1/share/:token` (public, read-only)
- Blocks:
  - `GET /api/v1/documents/:id/blocks`
  - `POST /api/v1/documents/:id/blocks`
  - `PATCH /api/v1/blocks/:blockId`
  - `DELETE /api/v1/blocks/:blockId`
  - `POST /api/v1/documents/:id/blocks/reorder`

## Environment
Backend requires:
- `WEB_ORIGIN`
- `DATABASE_URL`
- JWT secrets + TTLs

Frontend requires:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`

## Local Commands
- `npm run dev:web`
- `npm run dev:api`
- `npm run db:migrate`
- `npm run db:status`

## Deployment Notes (Render + Vercel)
- Backend on Render, Postgres on Render
- Frontend on Vercel
- `WEB_ORIGIN` should include the exact Vercel domain(s)
- Cookies: `SameSite=None` + `Secure` in production, `Lax` in dev

## Known UX Decisions
- Custom input system (textarea/input), not contentEditable
- Slash menu only opens at start of empty block
- Backspace at start of non-empty block does nothing
- Backspace at start of empty block deletes it, focuses previous text block
- If no previous editable block, creates a new paragraph at top
- Gap inserters (`+` button) let users insert blocks precisely between any pair of blocks
- Drag reordering uses `flushSync` for instant native live-shifting and a ghost layer without `pointer-events: none` to retain HTML drag reliability
- Autosave is race-safe: frontend sends debounced dirty blocks with `baseVersion`; backend enforces version match and returns `409` on stale writes
- Share links store only hashed tokens in DB; owner gets raw token only when generating/rotating link
- Shared document route renders read-only view and write APIs still require authenticated owner JWT
- Shared document payload includes owner metadata (`id`, `email`, `createdAt`) for attribution in public view

## Next Suggested Steps
1. Autosave with debounce and race handling
   - 1s debounce, AbortController or versioning
   - UI: Saving → Saved indicator already exists
2. Sharing system
   - Generate share token, read-only access
   - Enforce read-only on API
3. Edge-case hardening
   - Verify all required Enter/Backspace/Slash edge cases
   - Cross-account access tests
4. Production hardening
   - Error boundaries, logging, rate limiting on auth
   - README/AI_LOG completion checks
5. Deployment finalization
   - Render backend + Postgres
   - Vercel frontend
   - Migrations run in production
