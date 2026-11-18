-- Run this once in the Supabase SQL editor (Database > SQL Editor > New query).
-- It creates a shared "team" space, membership, and the docs table the app syncs.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Team',
  join_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.docs (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (workspace_id, kind, id)
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.docs enable row level security;

create or replace function public.is_member(ws uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid())
$$;

drop policy if exists "members read workspace" on public.workspaces;
create policy "members read workspace" on public.workspaces for select using (public.is_member(id));

drop policy if exists "members read members" on public.workspace_members;
create policy "members read members" on public.workspace_members for select using (public.is_member(workspace_id));

drop policy if exists "members use docs" on public.docs;
create policy "members use docs" on public.docs for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- Create a team and join it as the first member.
create or replace function public.create_workspace(team_name text) returns public.workspaces
language plpgsql security definer set search_path = public as $$
declare ws workspaces;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into workspaces(name) values (coalesce(nullif(team_name, ''), 'Team')) returning * into ws;
  insert into workspace_members(workspace_id, user_id, email) values (ws.id, auth.uid(), auth.jwt() ->> 'email');
  return ws;
end $$;

-- Join an existing team with its 6-character code.
create or replace function public.join_workspace(code text) returns public.workspaces
language plpgsql security definer set search_path = public as $$
declare ws workspaces;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into ws from workspaces where join_code = upper(trim(code));
  if ws.id is null then raise exception 'No team with that code'; end if;
  insert into workspace_members(workspace_id, user_id, email) values (ws.id, auth.uid(), auth.jwt() ->> 'email')
    on conflict do nothing;
  return ws;
end $$;

grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.join_workspace(text) to authenticated;

-- Live updates for the docs table.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
