# AI Log

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Scaffold Step 1 of the production block editor plan: monorepo setup, shared package, frontend shell, backend shell, and environment scaffolding.

**What it generated:**
Workspace structure, package manifests, starter Next.js and Express files, shared constants, and repo setup files.

**What was wrong or missing:**
Right now nothing

**What I fixed:**
Right now nothing

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Set up local PostgreSQL support for the project, including migrations, schema, and machine setup guidance.

**What it generated:**
A PostgreSQL connection utility, migration runner, initial schema SQL, and local setup documentation.

**What was wrong or missing:**
The local PostgreSQL server is not running yet, so migrations and live DB verification still need to be executed after setup.

**What I fixed:**
Right now nothing

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Implement Step 3 authentication with backend APIs, JWT and refresh token flow, and a minimal frontend to verify auth locally.

**What it generated:**
Auth controller, service, repository, middleware, password hashing, JWT helpers, shared validation schemas, and a small auth UI in the Next.js app.

**What was wrong or missing:**
Two monorepo path bugs showed up earlier in env and migration loading; those were fixed before auth work continued. Local end-to-end auth requests still need to be tested against the running API and PostgreSQL on your machine.

**What I fixed:**
Updated root path handling for env and migration resolution in the monorepo.

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Implement Step 4 document APIs with ownership checks and a minimal dashboard for create, list, rename, and delete flows.

**What it generated:**
Document repository, service, controller, validation schemas, and a frontend dashboard connected to the authenticated session.

**What was wrong or missing:**
Frontend env handling needed extra monorepo-specific fixes before the UI could call the API reliably.

**What I fixed:**
Adjusted web env loading so `NEXT_PUBLIC_*` values resolve correctly in the app workspace.
