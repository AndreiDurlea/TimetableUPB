create table if not exists public.holidays (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    start_date date not null,
    end_date date not null,
    type text not null default 'holiday' check (type in ('holiday', 'vacation')),
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.holidays enable row level security;

create policy "Allow public read access to holidays"
    on public.holidays
    for select
    using (true);

create policy "Allow service_role or admin to manage holidays"
    on public.holidays
    for all
    using (auth.role() = 'service_role' or exists (
        select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true
    ));

grant select on public.holidays to anon, authenticated;
grant all on public.holidays to service_role;

create table if not exists public.academic_calendar (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    start_date date not null,
    end_date date not null,
    type text not null check (type in ('semester_1', 'winter_break', 'semester_1_part2', 'exam_session_1', 'inter_semester_break', 'semester_2', 'exam_session_2', 'summer_break', 'holiday', 'vacation')),
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.academic_calendar enable row level security;

create policy "Allow public read access to academic_calendar"
    on public.academic_calendar
    for select
    using (true);

create policy "Allow service_role or admin to manage academic_calendar"
    on public.academic_calendar
    for all
    using (auth.role() = 'service_role' or exists (
        select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true
    ));

grant select on public.academic_calendar to anon, authenticated;
grant all on public.academic_calendar to service_role;

insert into public.holidays (name, start_date, end_date, type) values
    ('1 Decembrie', '2025-12-01', '2025-12-01', 'holiday'),
    ('Vacanța de iarnă', '2025-12-22', '2026-01-07', 'vacation'),
    ('1 Ianuarie', '2026-01-01', '2026-01-01', 'holiday'),
    ('2 Ianuarie', '2026-01-02', '2026-01-02', 'holiday'),
    ('6 Ianuarie', '2026-01-06', '2026-01-06', 'holiday'),
    ('7 Ianuarie', '2026-01-07', '2026-01-07', 'holiday'),
    ('Vacanța intersemestrială', '2026-02-09', '2026-02-22', 'vacation'),
    ('10 Aprilie (Vinerea Mare)', '2026-04-10', '2026-04-10', 'holiday'),
    ('Vacanța de primăvară', '2026-04-10', '2026-04-19', 'vacation'),
    ('13 Aprilie (A doua zi de Paște)', '2026-04-13', '2026-04-13', 'holiday'),
    ('14 Aprilie (A treia zi de Paște)', '2026-04-14', '2026-04-14', 'holiday'),
    ('1 Mai', '2026-05-01', '2026-05-01', 'holiday'),
    ('1 Iunie', '2026-06-01', '2026-06-01', 'holiday'),
    ('1 Decembrie', '2026-12-01', '2026-12-01', 'holiday'),
    ('Vacanța de iarnă', '2026-12-21', '2027-01-10', 'vacation'),
    ('1 Ianuarie', '2027-01-01', '2027-01-01', 'holiday'),
    ('2 Ianuarie', '2027-01-02', '2027-01-02', 'holiday'),
    ('6 Ianuarie', '2027-01-06', '2027-01-06', 'holiday'),
    ('7 Ianuarie', '2027-01-07', '2027-01-07', 'holiday'),
    ('24 Ianuarie', '2027-01-24', '2027-01-24', 'holiday'),
    ('Vacanța intersemestrială', '2027-02-15', '2027-02-28', 'vacation'),
    ('30 Aprilie (Vinerea Mare)', '2027-04-30', '2027-04-30', 'holiday'),
    ('Vacanța de primăvară', '2027-04-30', '2027-05-09', 'vacation'),
    ('1 Mai', '2027-05-01', '2027-05-01', 'holiday'),
    ('3 Mai (A doua zi de Paște)', '2027-05-03', '2027-05-03', 'holiday'),
    ('4 Mai (A treia zi de Paște)', '2027-05-04', '2027-05-04', 'holiday'),
    ('1 Iunie', '2027-06-01', '2027-06-01', 'holiday'),
    ('21 Iunie (Rusalii)', '2027-06-21', '2027-06-21', 'holiday'),
    ('Vacanța de vară', '2027-07-12', '2027-09-26', 'vacation');

insert into public.academic_calendar (name, start_date, end_date, type) values
    ('Semestrul 1', '2026-09-28', '2027-01-24', 'semester_1'),
    ('Vacanța de iarnă', '2026-12-21', '2027-01-10', 'winter_break'),
    ('Semestrul 1 (Partea 2)', '2027-01-11', '2027-01-24', 'semester_1_part2'),
    ('Sesiunea de examene (Iarnă)', '2027-01-25', '2027-02-14', 'exam_session_1'),
    ('Vacanța intersemestrială', '2027-02-15', '2027-02-28', 'inter_semester_break'),
    ('Semestrul 2', '2027-03-01', '2027-06-20', 'semester_2');
