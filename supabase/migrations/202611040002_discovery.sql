begin;
-- Invoker rights keep RLS active; only published projects enter discovery.
create function public.discover_projects(
  filter_q text default null, filter_location text default null, filter_skill text default null,
  filter_sector text default null, filter_stage text default null
) returns table (
  id uuid, title text, pitch text, sector text, location text, stage text, status text,
  owner_display_name text, required_skills text[], open_needs_count bigint,
  last_substantive_update_at timestamptz, created_at timestamptz
) language sql stable security invoker set search_path = '' as $$
  select p.id, p.title, p.pitch, p.sector, p.location, p.stage, p.status, p.owner_display_name,
    coalesce((select array_agg(distinct s order by s) from public.project_needs n cross join unnest(n.required_skills) s
      where n.project_id = p.id and n.status = 'open'), '{}'::text[]),
    (select count(*) from public.project_needs n where n.project_id = p.id and n.status = 'open'),
    (select max(updates.at) from (
      select post.created_at as at from public.project_posts post
        where post.project_id = p.id and post.type in ('progress','milestone','roadblock')
      union all select m.achieved_at from public.milestones m where m.project_id = p.id
    ) updates), p.created_at
  from public.projects p
  where p.visibility = 'public'
    and (nullif(btrim(filter_q), '') is null or position(lower(btrim(filter_q)) in lower(p.title || ' ' || p.pitch)) > 0)
    and (filter_location is null or lower(p.location) = lower(filter_location))
    and (filter_sector is null or lower(p.sector) = lower(filter_sector))
    and (filter_stage is null or lower(p.stage) = lower(filter_stage))
    and (filter_skill is null or exists (
      select 1 from public.project_needs n cross join unnest(n.required_skills) s
      where n.project_id = p.id and n.status = 'open' and lower(s) = lower(filter_skill)
    ));
$$;
revoke all on function public.discover_projects(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.discover_projects(text,text,text,text,text) to anon, authenticated;
commit;
