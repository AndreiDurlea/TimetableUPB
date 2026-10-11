-- Migration to improve profile sharing RPC, RLS policies, and fallback handling

-- 1. Ensure RLS policies on public.profiles
drop policy if exists "Allow users to update own profile" on public.profiles;
create policy "Allow users to update own profile"
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "Allow users to select own profile" on public.profiles;
create policy "Allow users to select own profile"
    on public.profiles
    for select
    using (auth.uid() = id);

-- 2. Create security definer function to update profile sharing
create or replace function public.set_profile_sharing(
    p_is_shared boolean,
    p_share_slug text,
    p_share_code text
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    update public.profiles
    set
        is_shared = p_is_shared,
        share_slug = coalesce(p_share_slug, share_slug),
        share_code = coalesce(p_share_code, share_code)
    where id = v_user_id;

    if not found then
        insert into public.profiles (id, is_shared, share_slug, share_code)
        values (v_user_id, p_is_shared, p_share_slug, p_share_code)
        on conflict (id) do update
        set
            is_shared = excluded.is_shared,
            share_slug = coalesce(excluded.share_slug, public.profiles.share_slug),
            share_code = coalesce(excluded.share_code, public.profiles.share_code);
    end if;

    return jsonb_build_object(
        'success', true,
        'is_shared', p_is_shared,
        'share_slug', p_share_slug,
        'share_code', p_share_code
    );
end;
$$;

grant execute on function public.set_profile_sharing(boolean, text, text) to authenticated, anon;

-- 3. Enhance get_shared_profile to be case-insensitive, trimmed, and allow owner access
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
    v_clean_slug text := lower(trim(p_slug));
begin
    if v_clean_slug is null or v_clean_slug = '' then
        return null;
    end if;

    select * into v_profile
    from public.profiles
    where (lower(trim(share_slug)) = v_clean_slug or lower(trim(share_code)) = v_clean_slug)
      and (is_shared = true or (auth.uid() is not null and auth.uid() = id))
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

-- 4. Ensure current active shared profiles are active
update public.profiles
set is_shared = true
where (share_slug = 'andrei-durlea-682726' or share_code = '682726' or id = '6c52d90c-7c83-4228-9892-e98d794e63d7');
