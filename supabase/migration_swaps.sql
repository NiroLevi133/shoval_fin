-- Migration: per-item meal substitutions (run once in Supabase SQL Editor)

create table if not exists meal_item_swaps (
  id          bigint generated always as identity primary key,
  user_phone  text not null,
  date        date not null,
  meal_type   text not null,
  item_index  int not null,
  replacement text not null,
  created_at  timestamptz not null default now(),
  unique (user_phone, date, meal_type, item_index)
);

create index if not exists meal_item_swaps_user_date_idx
  on meal_item_swaps (user_phone, date);
