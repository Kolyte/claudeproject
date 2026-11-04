-- Apply once to a dedicated Supabase project. Never rewrite an applied migration.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function public.valid_text_list(items text[], max_count integer default 30)
returns boolean language sql immutable set search_path = '' as $$
  select items is not null and cardinality(items) <= max_count
    and not exists (select 1 from unnest(items) v where v is null or length(btrim(v)) not between 1 and 60 or v <> btrim(v))
    and cardinality(items) = (select count(distinct v) from unnest(items) v);
$$;
revoke all on function public.valid_text_list(text[], integer) from public, anon, authenticated;
grant execute on function public.valid_text_list(text[], integer) to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name text not null default 'New member' check (length(btrim(display_name)) between 1 and 120),
  bio text not null default '' check (length(bio) <= 5000),
  location text not null default '' check (length(location) <= 120),
  declared_skills text[] not null default '{}' check (public.valid_text_list(declared_skills)),
  interests text[] not null default '{}' check (public.valid_text_list(interests)),
  hours_per_week integer check (hours_per_week between 1 and 80),
  participation_types text[] not null default '{}' check (public.valid_text_list(participation_types) and participation_types <@ array['cofounder','contributor','task','mentor']::text[]),
  work_modes text[] not null default '{}' check (public.valid_text_list(work_modes) and work_modes <@ array['local','remote','hybrid']::text[]),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id),
  owner_display_name text not null default '' check (length(owner_display_name) <= 120),
  title text not null default '' check (length(title) <= 120),
  pitch text not null default '' check (length(pitch) <= 300),
  problem text not null default '' check (length(problem) <= 5000),
  solution text not null default '' check (length(solution) <= 5000),
  sector text not null default '' check (length(sector) <= 120),
  location text not null default '' check (length(location) <= 120),
  stage text not null default 'idea' check (stage in ('idea','prototype','mvp','launched')),
  status text not null default 'active' check (status in ('active','paused','completed')),
  visibility text not null default 'draft' check (visibility in ('draft','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_fields check (visibility = 'draft' or (
    length(btrim(title)) > 0 and length(btrim(pitch)) > 0 and length(btrim(problem)) > 0
    and length(btrim(solution)) > 0 and length(btrim(sector)) > 0 and length(btrim(location)) > 0
    and length(btrim(owner_display_name)) > 0))
);

create table public.project_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id),
  type text not null check (type in ('progress','milestone','roadblock','opportunity','announcement')),
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  description text not null check (length(btrim(description)) between 1 and 5000),
  achieved_at timestamptz not null,
  evidence_url text check (evidence_url is null or (length(evidence_url) <= 2048 and evidence_url ~ '^https?://[^[:space:]]+$')),
  verification text not null default 'self_reported' check (verification = 'self_reported'),
  created_at timestamptz not null default now()
);

create table public.project_needs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  description text not null check (length(btrim(description)) between 1 and 5000),
  required_skills text[] not null default '{}' check (public.valid_text_list(required_skills)),
  desirable_skills text[] not null default '{}' check (public.valid_text_list(desirable_skills)),
  participation_type text not null check (participation_type in ('cofounder','contributor','task','mentor')),
  hours_per_week integer not null check (hours_per_week between 1 and 80),
  work_mode text not null check (work_mode in ('local','remote','hybrid')),
  location text not null check (length(btrim(location)) between 1 and 120),
  compensation text not null default 'unspecified' check (compensation in ('paid','voluntary','equity_discussion','unspecified')),
  status text not null default 'open' check (status in ('open','reviewing','filled','closed')),
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.project_needs(id) on delete cascade,
  applicant_id uuid not null default auth.uid() references public.profiles(id),
  message text not null check (length(btrim(message)) between 1 and 5000),
  status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (need_id, applicant_id)
);

create index projects_owner_idx on public.projects(owner_id);
create index projects_discovery_idx on public.projects(created_at desc, id) where visibility = 'public';
create index posts_project_idx on public.project_posts(project_id, created_at desc);
create index posts_author_idx on public.project_posts(author_id);
create index milestones_project_idx on public.milestones(project_id, achieved_at desc);
create index needs_project_idx on public.project_needs(project_id, status);
create index applications_applicant_idx on public.applications(applicant_id, created_at desc);

-- Immutable identity/parent fields apply even to direct Data API writes.
create function private.guard_record() returns trigger language plpgsql set search_path = '' as $$
begin
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
create trigger guard_profiles before insert or update on public.profiles for each row execute function private.guard_record();
create trigger guard_projects before insert or update on public.projects for each row execute function private.guard_record();
create trigger guard_posts before insert or update on public.project_posts for each row execute function private.guard_record();
create trigger guard_milestones before insert or update on public.milestones for each row execute function private.guard_record();
create trigger guard_needs before insert or update on public.project_needs for each row execute function private.guard_record();

-- Locks serialize application submission against need closure and publication changes.
-- Definer access is confined to this trigger; callers cannot invoke it as an RPC.
create function private.guard_application() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  project_owner uuid;
  need_state text;
  project_visibility text;
begin
  if tg_op = 'INSERT' then
    select n.status, p.owner_id, p.visibility into need_state, project_owner, project_visibility
      from public.project_needs n join public.projects p on p.id = n.project_id
      where n.id = new.need_id for share of n, p;
    if auth.uid() is null or new.applicant_id <> auth.uid() or project_owner = auth.uid() then
      raise exception 'Applicant must be the signed-in nonowner' using errcode = '42501';
    end if;
    if need_state is distinct from 'open' or project_visibility is distinct from 'public' then
      raise exception 'Need is not open' using errcode = '23514';
    end if;
    if new.status <> 'submitted' then raise exception 'New applications must be submitted' using errcode = '23514'; end if;
    new.created_at := now();
  else
    if (to_jsonb(new) - array['status','updated_at']) is distinct from (to_jsonb(old) - array['status','updated_at']) then
      raise exception 'Only application status can change' using errcode = '42501';
    end if;
    if old.status not in ('submitted','reviewing') then raise exception 'Application is final' using errcode = '42501'; end if;
    if auth.uid() = old.applicant_id then
      if new.status <> 'withdrawn' then raise exception 'Applicants may only withdraw' using errcode = '42501'; end if;
    else
      select p.owner_id into project_owner from public.project_needs n join public.projects p on p.id = n.project_id where n.id = old.need_id;
      if auth.uid() is null or auth.uid() is distinct from project_owner or new.status not in ('reviewing','accepted','rejected') then
        raise exception 'Only the project owner can review' using errcode = '42501';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.guard_application() from public, anon, authenticated;
create trigger guard_applications before insert or update on public.applications for each row execute function private.guard_application();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_posts enable row level security;
alter table public.milestones enable row level security;
alter table public.project_needs enable row level security;
alter table public.applications enable row level security;

revoke all on public.profiles, public.projects, public.project_posts, public.milestones, public.project_needs, public.applications from anon, authenticated;
grant select, insert, update on public.profiles, public.projects, public.project_posts, public.milestones, public.project_needs, public.applications to authenticated;
grant select on public.projects, public.project_posts, public.milestones, public.project_needs to anon;

create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy project_read on public.projects for select to anon, authenticated using (visibility = 'public' or owner_id = (select auth.uid()));
create policy project_insert on public.projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy project_update on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy post_read on public.project_posts for select to anon, authenticated using (exists (select 1 from public.projects p where p.id = project_id));
create policy post_insert on public.project_posts for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy post_update on public.project_posts for update to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (author_id = (select auth.uid()) and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy milestone_read on public.milestones for select to anon, authenticated using (exists (select 1 from public.projects p where p.id = project_id));
create policy milestone_insert on public.milestones for insert to authenticated with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy milestone_update on public.milestones for update to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy need_read on public.project_needs for select to anon, authenticated using (exists (select 1 from public.projects p where p.id = project_id));
create policy need_insert on public.project_needs for insert to authenticated with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy need_update on public.project_needs for update to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy application_read on public.applications for select to authenticated using (applicant_id = (select auth.uid()) or exists (select 1 from public.project_needs n join public.projects p on p.id = n.project_id where n.id = need_id and p.owner_id = (select auth.uid())));
create policy application_insert on public.applications for insert to authenticated with check (applicant_id = (select auth.uid()) and status = 'submitted' and exists (select 1 from public.project_needs n join public.projects p on p.id = n.project_id where n.id = need_id and n.status = 'open' and p.visibility = 'public' and p.owner_id <> (select auth.uid())));
create policy application_update on public.applications for update to authenticated using (applicant_id = (select auth.uid()) or exists (select 1 from public.project_needs n join public.projects p on p.id = n.project_id where n.id = need_id and p.owner_id = (select auth.uid()))) with check (applicant_id = (select auth.uid()) or exists (select 1 from public.project_needs n join public.projects p on p.id = n.project_id where n.id = need_id and p.owner_id = (select auth.uid())));

-- P4: rpc('application_review_summary', { application_id: <uuid> }).
-- Only the owning founder can obtain this allowlisted subset for an existing application.
create function public.application_review_summary(application_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare summary jsonb;
begin
  select jsonb_build_object('displayName', u.display_name, 'declaredSkills', u.declared_skills, 'hoursPerWeek', u.hours_per_week)
    into summary from public.applications a
    join public.project_needs n on n.id = a.need_id
    join public.projects p on p.id = n.project_id
    join public.profiles u on u.id = a.applicant_id
    where a.id = application_id and p.owner_id = auth.uid();
  if summary is null then raise exception 'Application not available' using errcode = '42501'; end if;
  return summary;
end;
$$;
revoke all on function public.application_review_summary(uuid) from public, anon, authenticated;
grant execute on function public.application_review_summary(uuid) to authenticated;

commit;
