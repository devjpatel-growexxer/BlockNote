create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  share_token_hash text,
  is_public boolean not null default false,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  type text not null,
  content jsonb not null,
  order_index numeric(20,6) not null,
  parent_id uuid references blocks(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocks_type_check check (
    type in ('paragraph', 'heading_1', 'heading_2', 'todo', 'code', 'divider', 'image')
  )
);

create index if not exists documents_user_id_idx on documents(user_id);
create index if not exists documents_updated_at_idx on documents(updated_at desc);
create index if not exists blocks_document_id_order_index_idx on blocks(document_id, order_index);
create index if not exists blocks_parent_id_idx on blocks(parent_id);
