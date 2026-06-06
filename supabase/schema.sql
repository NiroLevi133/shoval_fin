-- FitMeal AI - database schema (meal-structure model + tracking + RAG)
-- Run once in Supabase SQL Editor. Requires the pgvector extension.

create extension if not exists vector;

-- =============================================================
-- CONTENT TABLES (populated by scripts/seed.ts from data/)
-- =============================================================

-- Food groups for the substitutions booklet (7 groups)
create table if not exists food_groups (
  id          bigint generated always as identity primary key,
  key         text unique not null,
  name        text not null,
  note        text,
  sort_order  int not null default 0
);

-- Substitution items per group
create table if not exists substitution_items (
  id          bigint generated always as identity primary key,
  group_id    bigint not null references food_groups(id) on delete cascade,
  text        text not null,
  is_star     boolean not null default false,
  sort_order  int not null default 0
);

-- Meal structure ("required") per meal type
create table if not exists meal_templates (
  id                bigint generated always as identity primary key,
  meal_type         text unique not null,
  label             text not null,
  required_text     text not null,
  required_portions jsonb not null default '[]',
  sort_order        int not null default 0
);

-- Generic meal examples (3 per meal type, from the structure image)
create table if not exists meal_template_examples (
  id          bigint generated always as identity primary key,
  meal_type   text not null,
  text        text not null,
  sort_order  int not null default 0
);

-- Concrete weekly menu (Excel) - 7 days x 5 meals
create table if not exists weekly_menu (
  id          bigint generated always as identity primary key,
  day         text not null,
  meal_type   text not null,
  description text not null,
  calories    int,
  sort_order  int not null default 0,
  unique (day, meal_type)
);

-- Questions and answers
create table if not exists qna (
  id          bigint generated always as identity primary key,
  question    text not null,
  answer      text not null,
  sort_order  int not null default 0
);

-- =============================================================
-- RAG: documents + chunks with embeddings
-- =============================================================
create table if not exists documents (
  id          bigint generated always as identity primary key,
  title       text not null,
  source_type text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists doc_chunks (
  id          bigint generated always as identity primary key,
  document_id bigint references documents(id) on delete cascade,
  content     text not null,
  embedding   vector(1536),
  metadata    jsonb not null default '{}'
);

-- NOTE: no ANN index on purpose. The knowledge base is small (tens-to-hundreds
-- of chunks), so an exact sequential KNN scan gives perfect recall and is instant.
-- ivfflat with a high "lists" value on few rows causes near-empty recall.
-- For a large corpus, prefer hnsw:
--   create index on doc_chunks using hnsw (embedding vector_cosine_ops);

-- Similarity search function for RAG
create or replace function match_doc_chunks (
  query_embedding vector(1536),
  match_count int default 6
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from doc_chunks dc
  where dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- =============================================================
-- USER TABLES
-- =============================================================
create table if not exists users (
  phone       text primary key,
  name        text not null,
  gender      text,
  age         int,
  weight      numeric,
  height      numeric,
  goal        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Core tracking: marking a meal as eaten
create table if not exists meal_completions (
  id          bigint generated always as identity primary key,
  user_phone  text not null,
  date        date not null,
  meal_type   text not null,
  eaten       boolean not null default true,
  source      text not null default 'manual',
  photo_items jsonb,
  created_at  timestamptz not null default now(),
  unique (user_phone, date, meal_type)
);

create index if not exists meal_completions_user_date_idx
  on meal_completions (user_phone, date);

-- Measurements (optional)
create table if not exists measurements (
  id            bigint generated always as identity primary key,
  user_phone    text not null,
  date          date not null,
  weight        numeric,
  circumferences jsonb,
  photo_url     text,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists measurements_user_date_idx
  on measurements (user_phone, date);
