create or replace function public.create_foundathon_registration_with_cap(
  p_event_id uuid,
  p_application_id uuid,
  p_registration_email text,
  p_event_title text,
  p_details jsonb,
  p_problem_statement_id text,
  p_cap integer
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_existing_count integer;
  v_inserted_id uuid;
begin
  perform pg_advisory_xact_lock(
    hashtext(p_event_id::text),
    hashtext(p_problem_statement_id)
  );

  if exists (
    select 1
    from public.eventsregistrations
    where event_id = p_event_id
      and application_id = p_application_id
  ) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  select count(*)
  into v_existing_count
  from public.eventsregistrations
  where event_id = p_event_id
    and details ->> 'problemStatementId' = p_problem_statement_id;

  if v_existing_count >= p_cap then
    raise exception 'STATEMENT_FULL';
  end if;

  insert into public.eventsregistrations (
    event_id,
    event_title,
    application_id,
    details,
    registration_email,
    is_team_entry
  )
  values (
    p_event_id,
    p_event_title,
    p_application_id,
    p_details,
    p_registration_email,
    true
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

grant execute on function public.create_foundathon_registration_with_cap(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  text,
  integer
) to authenticated;
