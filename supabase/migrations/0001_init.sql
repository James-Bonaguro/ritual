-- Ritual: cross-device sync schema.
--
-- Records are stored as JSONB payloads rather than being shredded into columns.
-- The client already owns the shape (src/data/types.ts), the data is only ever
-- read back whole, and it means a change to the model does not need a migration
-- in lockstep with a deploy. `id` and `updated_at` are lifted out because they
-- are the only fields the server reasons about: identity, and which side of a
-- last-write-wins conflict should survive.

create table if not exists public.movements (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists public.sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists public.settings (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null,
  payload jsonb not null
);

create index if not exists movements_user_idx on public.movements (user_id);
create index if not exists sessions_user_idx on public.sessions (user_id);
create index if not exists settings_user_idx on public.settings (user_id);

-- Row-level security. Every policy is scoped to auth.uid(), so a leaked anon
-- key grants nothing without a valid session: the anon key is a routing
-- credential, not an authorisation one.
alter table public.movements enable row level security;
alter table public.sessions enable row level security;
alter table public.settings enable row level security;

do $$
declare
  target text;
begin
  foreach target in array array['movements', 'sessions', 'settings'] loop
    execute format(
      'drop policy if exists %I on public.%I', target || '_owner_select', target
    );
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      target || '_owner_select', target
    );

    execute format(
      'drop policy if exists %I on public.%I', target || '_owner_insert', target
    );
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      target || '_owner_insert', target
    );

    execute format(
      'drop policy if exists %I on public.%I', target || '_owner_update', target
    );
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      target || '_owner_update', target
    );

    execute format(
      'drop policy if exists %I on public.%I', target || '_owner_delete', target
    );
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      target || '_owner_delete', target
    );
  end loop;
end $$;
