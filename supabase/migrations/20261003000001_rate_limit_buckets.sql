-- consume_rate_limit is callable by signed-in users (it must be: the API routes call it with
-- the user's own JWT). Accept only the buckets the app uses, so a user calling the RPC
-- directly can't create an unbounded number of rows under made-up bucket names.

create or replace function public.consume_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  now_ts timestamptz := clock_timestamp();
  win interval;
  row_state private.rate_limits;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_bucket is null or p_bucket not in ('chat', 'credentials', 'models')
     or p_max is null or p_max not between 1 and 100000
     or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  win := make_interval(secs => p_window_seconds);

  insert into private.rate_limits as rl (user_id, bucket, window_start, request_count)
  values (uid, p_bucket, now_ts, 1)
  on conflict (user_id, bucket) do update
    set window_start = case when rl.window_start + win <= now_ts then now_ts else rl.window_start end,
        request_count = case when rl.window_start + win <= now_ts then 1 else rl.request_count + 1 end
  returning * into row_state;

  return query
    select row_state.request_count <= p_max,
           greatest(p_max - row_state.request_count, 0),
           row_state.window_start + win;
end;
$$;

-- Rows under any other bucket name can only have come from direct calls; drop them.
delete from private.rate_limits where bucket not in ('chat', 'credentials', 'models');
