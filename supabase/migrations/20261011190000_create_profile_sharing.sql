alter table public.profiles
    add column if not exists is_shared boolean default false,
    add column if not exists share_slug text unique,
    add column if not exists share_code text;

create index if not exists idx_profiles_share_slug on public.profiles (share_slug) where is_shared = true;
create index if not exists idx_profiles_share_code on public.profiles (share_code) where is_shared = true;

create policy "Allow public read access to shared profiles"
    on public.profiles
    for select
    using (is_shared = true);

create policy "Allow public read access to user_classes for shared profiles"
    on public.user_classes
    for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = user_classes.user_id
            and profiles.is_shared = true
        )
    );

create policy "Allow public read access to user_removed_classes for shared profiles"
    on public.user_removed_classes
    for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = user_removed_classes.user_id
            and profiles.is_shared = true
        )
    );

create or replace function public.get_shared_profile(p_slug text)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_profile record;
    v_manual_ids text[];
    v_removed_ids text[];
    v_subgroup record;
    v_hierarchy text := '';
    v_user_name text := '';
begin
    select * into v_profile
    from public.profiles
    where (share_slug = p_slug or share_code = p_slug)
      and is_shared = true
    limit 1;

    if not found then
        return null;
    end if;

    select coalesce(array_agg(class_id::text), array[]::text[]) into v_manual_ids
    from public.user_classes
    where user_id = v_profile.id;

    select coalesce(array_agg(class_id::text), array[]::text[]) into v_removed_ids
    from public.user_removed_classes
    where user_id = v_profile.id;

    select coalesce(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        split_part(email, '@', 1)
    ) into v_user_name
    from auth.users
    where id = v_profile.id;

    if v_profile.subgroup_id is not null then
        select
            s.name as subgroup_name,
            g.name as group_name,
            ser.name as series_name,
            d.name as domain_name,
            f.shorthand as faculty_shorthand
        into v_subgroup
        from public.subgroups s
        join public.groups g on s.group_id = g.id
        join public.series ser on g.series_id = ser.id
        join public.domains d on ser.domain_id = d.id
        join public.faculties f on d.faculty_id = f.id
        where s.id = v_profile.subgroup_id;

        if found then
            v_hierarchy := v_subgroup.faculty_shorthand || '-' ||
                           v_subgroup.domain_name || '-' ||
                           v_subgroup.series_name || '-' ||
                           v_subgroup.group_name || v_subgroup.subgroup_name;
        end if;
    end if;

    return jsonb_build_object(
        'user_id', v_profile.id,
        'user_name', coalesce(v_user_name, 'Anonymous'),
        'subgroup_id', v_profile.subgroup_id,
        'hierarchy', v_hierarchy,
        'share_slug', v_profile.share_slug,
        'share_code', v_profile.share_code,
        'manual_class_ids', coalesce(v_manual_ids, array[]::text[]),
        'removed_class_ids', coalesce(v_removed_ids, array[]::text[])
    );
end;
$$;

grant execute on function public.get_shared_profile(text) to anon, authenticated, service_role;
