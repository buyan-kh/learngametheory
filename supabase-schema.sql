-- ==========================================================================
-- Game Theory Lab - Supabase Database Schema
-- ==========================================================================
-- Run this file in your Supabase SQL Editor (Dashboard > SQL Editor) to set
-- up the required tables, row-level security policies, indexes, and triggers.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Extensions
-- --------------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

-- Scenarios: stores user-submitted game descriptions and their AI analyses.
create table scenarios (
  id         uuid        default uuid_generate_v4() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  input      text        not null,
  title      text        generated always as ((analysis->>'title')::text) stored,
  analysis   jsonb       not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Simulations: stores simulation configurations and their results.
create table simulations (
  id          uuid        default uuid_generate_v4() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  scenario_id uuid        references scenarios(id) on delete cascade,
  config      jsonb       not null,
  results     jsonb       not null,
  created_at  timestamptz default now() not null
);

-- Comparisons: stores side-by-side comparisons between two scenarios.
create table comparisons (
  id            uuid        default uuid_generate_v4() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  scenario_a_id uuid        references scenarios(id) on delete set null,
  scenario_b_id uuid        references scenarios(id) on delete set null,
  notes         text,
  created_at    timestamptz default now() not null
);

-- --------------------------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------------------------

alter table scenarios   enable row level security;
alter table simulations enable row level security;
alter table comparisons enable row level security;

-- Scenarios policies
create policy "Users can view own scenarios"
  on scenarios for select
  using (auth.uid() = user_id);

create policy "Users can insert own scenarios"
  on scenarios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scenarios"
  on scenarios for update
  using (auth.uid() = user_id);

create policy "Users can delete own scenarios"
  on scenarios for delete
  using (auth.uid() = user_id);

-- Simulations policies
create policy "Users can view own simulations"
  on simulations for select
  using (auth.uid() = user_id);

create policy "Users can insert own simulations"
  on simulations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own simulations"
  on simulations for delete
  using (auth.uid() = user_id);

-- Comparisons policies
create policy "Users can view own comparisons"
  on comparisons for select
  using (auth.uid() = user_id);

create policy "Users can insert own comparisons"
  on comparisons for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comparisons"
  on comparisons for delete
  using (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------------

create index scenarios_user_id_idx    on scenarios(user_id);
create index scenarios_created_at_idx on scenarios(created_at desc);
create index simulations_user_id_idx     on simulations(user_id);
create index simulations_scenario_id_idx on simulations(scenario_id);
create index comparisons_user_id_idx     on comparisons(user_id);

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

-- Automatically update the updated_at column on row modification.
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger scenarios_updated_at
  before update on scenarios
  for each row execute function update_updated_at();
