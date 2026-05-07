create table if not exists public.workspace_rooms (
  room_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_rooms enable row level security;

drop policy if exists "workspace_rooms_select" on public.workspace_rooms;
create policy "workspace_rooms_select"
  on public.workspace_rooms
  for select
  using (true);

drop policy if exists "workspace_rooms_insert" on public.workspace_rooms;
create policy "workspace_rooms_insert"
  on public.workspace_rooms
  for insert
  with check (true);

drop policy if exists "workspace_rooms_update" on public.workspace_rooms;
create policy "workspace_rooms_update"
  on public.workspace_rooms
  for update
  using (true)
  with check (true);
