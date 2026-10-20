-- Apply to the existing 0Password database before deploying this application.
-- All functions are service-role-only: Clerk identity is checked in server actions.
begin;

create table public.vault_metadata (
    user_id text primary key references public.users(id) on delete cascade,
    vault_id uuid not null unique default gen_random_uuid(),
    version integer not null check (version = 2),
    salt text not null check (length(salt) = 24),
    iterations integer not null check (iterations = 600000),
    encrypted_verification text not null,
    verification_iv text not null check (length(verification_iv) = 16)
);
alter table public.vault_metadata enable row level security;
alter table public.vault_items enable row level security;
alter table public.users enable row level security;
-- Browser requests use Clerk, not Supabase Auth. These tables must never be
-- exposed through a public Supabase API key, regardless of existing policies.
revoke all on public.vault_metadata, public.vault_items, public.users from public, anon, authenticated;
grant select, insert, update, delete on public.vault_metadata, public.vault_items, public.users to service_role;

-- Serialize setup, writes, and resets for a user. The complete old ciphertext
-- snapshot is compared before migration so a stale tab cannot overwrite edits.
create function public.initialize_vault(p_user_id text, p_metadata jsonb, p_snapshot jsonb, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
    v_vault_id uuid;
    v_count bigint;
    v_verifiers bigint;
begin
    perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));
    if exists (select 1 from public.vault_metadata where user_id = p_user_id) then
        raise exception 'Vault already initialized. Reload and unlock again.';
    end if;
    if jsonb_typeof(p_snapshot) is distinct from 'array' or jsonb_typeof(p_items) is distinct from 'array' then
        raise exception 'Invalid migration data.';
    end if;
    select count(*) into v_count from public.vault_items where user_id = p_user_id;
    if v_count <> jsonb_array_length(p_snapshot)
       or (select count(distinct value->>'id') from jsonb_array_elements(p_snapshot)) <> v_count
       or exists (
           select 1 from public.vault_items v where v.user_id = p_user_id and not exists (
               select 1 from jsonb_array_elements(p_snapshot) s
               where s->>'id' = v.id::text and s->>'title' = v.title
                 and s->>'encrypted_password' = v.encrypted_password and s->>'iv' = v.iv
           )
       ) then
        raise exception 'Vault changed during setup. Reload and try again.';
    end if;
    select count(*) into v_verifiers from public.vault_items
        where user_id = p_user_id and title = '__0PASSWORD_VERIFICATION__';
    if v_verifiers > 1 then raise exception 'Multiple legacy verification records. Migration aborted.'; end if;
    if jsonb_array_length(p_items) <> v_count - v_verifiers
       or (select count(distinct value->>'id') from jsonb_array_elements(p_items)) <> v_count - v_verifiers
       or exists (
           select 1 from jsonb_array_elements(p_items) i where not exists (
               select 1 from public.vault_items v where v.user_id = p_user_id
                 and v.id::text = i->>'id' and v.title <> '__0PASSWORD_VERIFICATION__'
           ) or coalesce(length(i->>'encrypted_password'), 0) < 24 or coalesce(length(i->>'iv'), 0) <> 16
       ) then
        raise exception 'Incomplete migration. No data has been changed.';
    end if;
    update public.vault_items v set encrypted_password = i.value->>'encrypted_password', iv = i.value->>'iv'
        from jsonb_array_elements(p_items) i
        where v.user_id = p_user_id and v.id::text = i.value->>'id';
    delete from public.vault_items where user_id = p_user_id and title = '__0PASSWORD_VERIFICATION__';
    insert into public.vault_metadata (user_id, version, salt, iterations, encrypted_verification, verification_iv)
        values (p_user_id, (p_metadata->>'version')::integer, p_metadata->>'salt',
            (p_metadata->>'iterations')::integer, p_metadata->>'encrypted_verification', p_metadata->>'verification_iv')
        returning vault_id into v_vault_id;
    return v_vault_id;
end;
$$;

create function public.write_vault_item(p_user_id text, p_vault_id uuid, p_operation text, p_id text, p_item jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
    v_id text;
begin
    perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));
    if not exists (select 1 from public.vault_metadata where user_id = p_user_id and vault_id = p_vault_id) then
        raise exception 'Vault session expired. Lock and unlock your vault.';
    end if;
    if p_operation in ('insert', 'update') and (
        coalesce(length(trim(p_item->>'title')), 0) = 0 or p_item->>'title' = '__0PASSWORD_VERIFICATION__'
    ) then raise exception 'Invalid service name.'; end if;
    if p_operation = 'insert' then
        insert into public.vault_items (user_id, title, login_id, website_url, encrypted_password, iv)
            values (p_user_id, p_item->>'title', p_item->>'login_id', p_item->>'website_url',
                p_item->>'encryptedPassword', p_item->>'iv') returning id::text into v_id;
    elsif p_operation = 'update' then
        update public.vault_items set title = p_item->>'title', login_id = p_item->>'login_id',
            website_url = p_item->>'website_url',
            encrypted_password = case when p_item ? 'encryptedPassword' then p_item->>'encryptedPassword' else encrypted_password end,
            iv = case when p_item ? 'iv' then p_item->>'iv' else iv end
            where user_id = p_user_id and id::text = p_id and title <> '__0PASSWORD_VERIFICATION__'
            returning id::text into v_id;
    elsif p_operation = 'delete' then
        delete from public.vault_items where user_id = p_user_id and id::text = p_id and title <> '__0PASSWORD_VERIFICATION__'
            returning id::text into v_id;
    else raise exception 'Invalid operation.';
    end if;
    if v_id is null then raise exception 'Vault item no longer exists.'; end if;
    return v_id;
end;
$$;

-- A reset dialog captures a revision before confirmation. For old vaults without
-- metadata, fingerprint the complete rows so delayed resets cannot target new data.
create function public.vault_revision(p_user_id text)
returns text language sql stable security definer set search_path = '' as $$
    select coalesce(
        (select vault_id::text from public.vault_metadata where user_id = p_user_id),
        'legacy:' || md5(coalesce((
            select jsonb_agg(to_jsonb(v) order by v.id::text)::text
            from public.vault_items v where v.user_id = p_user_id
        ), '[]'))
    );
$$;

create function public.reset_vault(p_user_id text, p_expected_revision text)
returns void language plpgsql security definer set search_path = '' as $$
begin
    perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));
    if p_expected_revision is distinct from public.vault_revision(p_user_id) then
        raise exception 'Vault changed since reset was requested. Close the dialog and review your vault before trying again.';
    end if;
    delete from public.vault_items where user_id = p_user_id;
    delete from public.vault_metadata where user_id = p_user_id;
end;
$$;

-- Parameters never enter PostgREST's filter grammar. LIKE wildcard characters
-- are escaped here; literal stars and punctuation remain ordinary text.
create function public.search_vault_items(p_user_id text, p_query text)
returns setof public.vault_items language sql stable security definer set search_path = '' as $$
    with pattern as (
        select '%' || replace(replace(replace(left(coalesce(p_query, ''), 200),
            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' as value
    )
    select v.* from public.vault_items v cross join pattern
        where v.user_id = p_user_id and v.title <> '__0PASSWORD_VERIFICATION__'
          and (v.title ilike pattern.value escape chr(92) or v.login_id ilike pattern.value escape chr(92))
        order by v.created_at desc;
$$;

revoke all on function public.search_vault_items(text, text) from public, anon, authenticated;
grant execute on function public.search_vault_items(text, text) to service_role;
revoke all on function public.initialize_vault(text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.write_vault_item(text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.vault_revision(text) from public, anon, authenticated;
revoke all on function public.reset_vault(text, text) from public, anon, authenticated;
grant execute on function public.initialize_vault(text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.write_vault_item(text, uuid, text, text, jsonb) to service_role;
grant execute on function public.vault_revision(text) to service_role;
grant execute on function public.reset_vault(text, text) to service_role;
commit;
