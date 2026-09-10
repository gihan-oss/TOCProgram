-- ============================================================================
-- FIX: public worksheet link says "not enrolled" and won't save responses
-- ----------------------------------------------------------------------------
-- Run this ONCE in Supabase → SQL Editor → New query → paste → Run.
-- It replaces the old save function (which only accepted enrolled members) with
-- the version that lets ANYONE fill the shared worksheet: a name picked from the
-- roster, OR a name + email typed by someone not on the roster. Answers save to
-- that email's progress and appear when they sign in. Nothing else is touched.
-- ============================================================================

drop function if exists public.save_public_worksheet(text, jsonb, text[]);
create or replace function public.save_public_worksheet(
  p_token text,
  p_worksheets jsonb,
  p_done text[]
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  e         text;
  cur_meta  jsonb;
  cur_done  text[];
  cur_ws    jsonb;
begin
  -- p_token is EITHER a roster token (md5 of an enrolled member's email) …
  select lower(m.email) into e
    from public.members m
    where md5(lower(m.email)) = p_token
    limit 1;
  -- … OR a plain email typed by someone who isn't on the roster dropdown, so
  -- the link still works even when no one is enrolled yet.
  if e is null then
    if p_token ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      e := lower(trim(p_token));
    else
      raise exception 'unknown participant';
    end if;
  end if;

  select meta, done into cur_meta, cur_done
    from public.course_progress where email = e;

  cur_meta := coalesce(cur_meta, '{}'::jsonb);
  cur_ws   := coalesce(cur_meta -> 'worksheets', '{}'::jsonb);
  cur_ws   := cur_ws || coalesce(p_worksheets, '{}'::jsonb);
  cur_meta := jsonb_set(cur_meta, '{worksheets}', cur_ws, true);
  if not (cur_meta ? 'scores') then
    cur_meta := jsonb_set(cur_meta, '{scores}', '{}'::jsonb, true);
  end if;

  cur_done := (
    select coalesce(array_agg(distinct d), '{}')
    from unnest(coalesce(cur_done, '{}') || coalesce(p_done, '{}')) as d
  );

  insert into public.course_progress (email, done, meta, updated_at)
    values (e, cur_done, cur_meta, now())
  on conflict (email) do update
    set done = excluded.done, meta = excluded.meta, updated_at = now();
end;
$$;
grant execute on function public.save_public_worksheet(text, jsonb, text[]) to anon, authenticated;
