begin;
-- P5's local-only administrative seed preserves fictional dates and upserts
-- published fixtures. Ordinary authenticated/anonymous application writes keep
-- the identity, timestamps and draft-first guards below. This function is an
-- invoker-rights trigger; a user cannot choose the database service_role.
create or replace function private.guard_record() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'Identity and timestamps are read-only' using errcode = '42501';
    end if;
    if tg_table_name = 'projects' then
      if new.owner_id is distinct from old.owner_id then
        raise exception 'Project owner is immutable' using errcode = '42501';
      end if;
    end if;
    if tg_table_name in ('project_posts','milestones','project_needs') then
      if new.project_id is distinct from old.project_id then
        raise exception 'Project is immutable' using errcode = '42501';
      end if;
    end if;
    if tg_table_name = 'project_posts' then
      if new.author_id is distinct from old.author_id then
        raise exception 'Author is immutable' using errcode = '42501';
      end if;
    end if;
  end if;
  if tg_table_name in ('profiles','projects') then new.updated_at := now(); end if;
  if tg_table_name = 'projects' then
    if tg_op = 'INSERT' and new.visibility <> 'draft' then
      raise exception 'Create a draft before publishing' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' or (old.visibility = 'draft' and new.visibility = 'public') then
      select display_name into new.owner_display_name from public.profiles where id = new.owner_id;
    else
      new.owner_display_name := old.owner_display_name;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_record() from public, anon, authenticated;
commit;
