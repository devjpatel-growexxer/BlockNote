# SQL Migrations

This directory stores ordered SQL migrations for the local and production PostgreSQL schema.

## Rules

- Files run in lexical order.
- Never edit an already-applied migration in a shared environment.
- Add a new numbered file for every schema change.
- Rollbacks are manual in v1; document them when a migration is added.

## Current Migrations

- `001_initial_schema.sql`
  - Creates `users`, `documents`, and `blocks`
  - Enables `pgcrypto` for UUID generation
  - Adds indexes for common document and block queries
