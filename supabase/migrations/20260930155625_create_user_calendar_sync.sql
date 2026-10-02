create table if not exists public.user_calendar_sync (
    user_id uuid primary key references auth.users(id) on delete cascade,
    calendar_id text not null,
    calendar_name text default 'Orar facultate',
    refresh_token text,
    subgroup_id uuid references public.subgroups(id) on delete set null,
    synced_fingerprint text,
    synced_class_ids text[] default '{}',
    synced_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.user_calendar_sync enable row level security;

create policy "Users can view own calendar sync"
    on public.user_calendar_sync
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own calendar sync"
    on public.user_calendar_sync
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own calendar sync"
    on public.user_calendar_sync
    for update
    using (auth.uid() = user_id);

create policy "Users can delete own calendar sync"
    on public.user_calendar_sync
    for delete
    using (auth.uid() = user_id);

grant all on public.user_calendar_sync to authenticated;
grant all on public.user_calendar_sync to service_role;
