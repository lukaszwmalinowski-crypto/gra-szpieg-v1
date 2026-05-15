create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'voting', 'results')),
  host_player_id uuid,
  location text,
  category text not null,
  spy_player_id uuid,
  current_question_target_player_id uuid,
  round_number integer not null default 0,
  timer_seconds integer not null default 480,
  round_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0 and char_length(name) <= 32),
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null,
  voter_player_id uuid not null references public.players(id) on delete cascade,
  voted_player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, round_number, voter_player_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rooms_host_player_id_fkey') then
    alter table public.rooms add constraint rooms_host_player_id_fkey foreign key (host_player_id) references public.players(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rooms_spy_player_id_fkey') then
    alter table public.rooms add constraint rooms_spy_player_id_fkey foreign key (spy_player_id) references public.players(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rooms_current_question_target_player_id_fkey') then
    alter table public.rooms add constraint rooms_current_question_target_player_id_fkey foreign key (current_question_target_player_id) references public.players(id) on delete set null;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.votes enable row level security;

drop policy if exists "rooms are usable by anonymous game clients" on public.rooms;
create policy "rooms are usable by anonymous game clients" on public.rooms
for all using (true) with check (true);

drop policy if exists "players are usable by anonymous game clients" on public.players;
create policy "players are usable by anonymous game clients" on public.players
for all using (true) with check (true);

drop policy if exists "votes are usable by anonymous game clients" on public.votes;
create policy "votes are usable by anonymous game clients" on public.votes
for all using (true) with check (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players') then
    alter publication supabase_realtime add table public.players;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes') then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;
