-- Nebula Assistant — initial schema
--
-- Security model
--   * Every user-owned table has RLS enabled with owner-only policies keyed on auth.uid().
--   * Child rows carry user_id and reference their parent through a composite
--     (id, user_id) foreign key, so a row can never point at another user's parent
--     even if a client forges IDs.
--   * The anon role gets no table privileges at all.
--   * Provider API keys are encrypted by the application (AES-256-GCM, key held only
--     by the server) before they reach the database. The ciphertext column is not
--     selectable by clients; the server reads it through get_provider_secret().

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (identity data shown in the UI; email stays in auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- User settings (personalization, appearance, chat preferences)
-- Enum-like values are format-checked here and validated against the
-- application registry, so new options don't require a migration.
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 60),
  about_me text not null default '' check (char_length(about_me) <= 2000),
  custom_instructions text not null default '' check (char_length(custom_instructions) <= 4000),
  response_style text not null default 'balanced' check (response_style ~ '^[a-z][a-z_]{0,31}$'),
  theme text not null default 'system' check (theme ~ '^[a-z][a-z_]{0,31}$'),
  text_size text not null default 'default' check (text_size ~ '^[a-z][a-z_]{0,31}$'),
  send_on_enter boolean not null default true,
  show_reasoning boolean not null default true,
  default_provider text check (default_provider is null or default_provider ~ '^[a-z][a-z0-9-]{1,31}$'),
  default_model text check (default_model is null or char_length(default_model) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  instructions text not null default '' check (char_length(instructions) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index projects_user_updated_idx on public.projects (user_id, updated_at desc);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid,
  title text not null default 'New chat' check (char_length(title) between 1 and 200),
  provider_id text check (provider_id is null or provider_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  model_id text check (model_id is null or char_length(model_id) between 1 and 200),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- Deleting a project keeps its conversations (they move back to "no project").
  foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete set null (project_id)
);

create index conversations_user_recent_idx on public.conversations (user_id, last_message_at desc);
create index conversations_project_recent_idx
  on public.conversations (project_id, last_message_at desc)
  where project_id is not null;

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Messages (normalized: one row per turn, ordered by seq, paginated)
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '' check (char_length(content) <= 400000),
  reasoning text not null default '' check (char_length(reasoning) <= 200000),
  attachments jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attachments) = 'array' and octet_length(attachments::text) <= 1200000),
  status text not null default 'complete' check (status in ('complete', 'cancelled', 'failed')),
  provider_id text check (provider_id is null or provider_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  model_id text check (model_id is null or char_length(model_id) between 1 and 200),
  finish_reason text check (finish_reason is null or char_length(finish_reason) <= 40),
  usage jsonb check (usage is null or jsonb_typeof(usage) = 'object'),
  error jsonb check (error is null or jsonb_typeof(error) = 'object'),
  feedback smallint check (feedback is null or feedback in (-1, 1)),
  seq bigint generated always as identity,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text tsvector generated always as (to_tsvector('simple', left(content, 100000))) stored,
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id) on delete cascade
);

create index messages_conversation_seq_idx on public.messages (conversation_id, seq);
create index messages_user_idx on public.messages (user_id);
create index messages_search_idx on public.messages using gin (search_text);

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function private.set_updated_at();

create or replace function private.touch_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function private.touch_conversation();

-- ---------------------------------------------------------------------------
-- Provider credentials (BYOK)
-- ---------------------------------------------------------------------------

create table public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider_id text not null check (provider_id ~ '^[a-z][a-z0-9-]{1,31}$'),
  secret_ciphertext text not null check (char_length(secret_ciphertext) between 20 and 8192),
  key_hint text not null check (char_length(key_hint) between 1 and 32),
  options jsonb not null default '{}'::jsonb
    check (jsonb_typeof(options) = 'object' and octet_length(options::text) <= 2048),
  status text not null default 'unverified' check (status in ('unverified', 'valid', 'invalid')),
  last_verified_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider_id)
);

create trigger provider_credentials_set_updated_at
  before update on public.provider_credentials
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window, per user and bucket)
-- ---------------------------------------------------------------------------

create table private.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  request_count integer not null,
  primary key (user_id, bucket)
);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: profile (seeded from OAuth metadata) + default settings
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := nullif(btrim(left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 80)), '');
  avatar text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
begin
  if avatar is not null and (avatar !~ '^https://' or char_length(avatar) > 2048) then
    avatar := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, name, avatar)
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.provider_credentials enable row level security;
alter table private.rate_limits enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- user_settings
create policy user_settings_select_own on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_settings_update_own on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- projects
create policy projects_select_own on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_insert_own on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy projects_update_own on public.projects
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy projects_delete_own on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- conversations
create policy conversations_select_own on public.conversations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy conversations_insert_own on public.conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy conversations_update_own on public.conversations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy conversations_delete_own on public.conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

-- messages
create policy messages_select_own on public.messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy messages_insert_own on public.messages
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy messages_update_own on public.messages
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy messages_delete_own on public.messages
  for delete to authenticated using ((select auth.uid()) = user_id);

-- provider_credentials
create policy provider_credentials_select_own on public.provider_credentials
  for select to authenticated using ((select auth.uid()) = user_id);
create policy provider_credentials_insert_own on public.provider_credentials
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy provider_credentials_update_own on public.provider_credentials
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy provider_credentials_delete_own on public.provider_credentials
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Table privileges (defense in depth on top of RLS)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on public.profiles, public.user_settings, public.projects,
  public.conversations, public.messages, public.provider_credentials from authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

-- Credentials: clients can never read the ciphertext column back.
grant select (id, user_id, provider_id, key_hint, options, status, last_verified_at, last_error, created_at, updated_at)
  on public.provider_credentials to authenticated;
grant insert (user_id, provider_id, secret_ciphertext, key_hint, options, status, last_verified_at, last_error)
  on public.provider_credentials to authenticated;
grant update (secret_ciphertext, key_hint, options, status, last_verified_at, last_error)
  on public.provider_credentials to authenticated;
grant delete on public.provider_credentials to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Server-side read of the caller's own encrypted credential.
create or replace function public.get_provider_secret(p_provider_id text)
returns table (secret_ciphertext text, options jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select c.secret_ciphertext, c.options
    from public.provider_credentials c
   where c.user_id = (select auth.uid())
     and c.provider_id = p_provider_id;
$$;

-- Conversation search across titles and message text. Runs as the caller, so RLS applies.
create or replace function public.search_conversations(search_query text, max_results integer default 20)
returns table (
  conversation_id uuid,
  title text,
  project_id uuid,
  snippet text,
  last_message_at timestamptz,
  match_kind text
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  q text := btrim(left(coalesce(search_query, ''), 200));
  ts tsquery;
  like_pattern text;
  lim integer := least(greatest(coalesce(max_results, 20), 1), 50);
begin
  if char_length(q) = 0 then
    return;
  end if;

  select to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' & '))
    into ts
    from (
      select regexp_split_to_table(lower(regexp_replace(q, '[^[:alnum:][:space:]]+', ' ', 'g')), '\s+') as w
    ) words
   where w <> '';

  like_pattern := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  with title_hits as (
    select c.id, c.title, c.project_id, null::text as snippet, c.last_message_at, 'title'::text as kind, 0 as priority
      from public.conversations c
     where c.title ilike like_pattern
  ),
  message_hits as (
    select distinct on (m.conversation_id)
           m.conversation_id as id,
           c.title,
           c.project_id,
           ts_headline('simple', left(m.content, 20000), ts,
             'MaxWords=22, MinWords=8, MaxFragments=1, StartSel="", StopSel=""') as snippet,
           c.last_message_at,
           'message'::text as kind,
           1 as priority
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
     where ts is not null
       and m.search_text @@ ts
     order by m.conversation_id, m.seq desc
  ),
  combined as (
    select * from title_hits
    union all
    select * from message_hits
  )
  select r.id, r.title, r.project_id, r.snippet, r.last_message_at, r.kind
    from (
      select distinct on (combined.id) combined.*
        from combined
       order by combined.id, combined.priority
    ) r
   order by r.last_message_at desc
   limit lim;
end;
$$;

-- Fixed-window rate limiter used by the chat and credential endpoints.
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
  if p_bucket is null or char_length(p_bucket) not between 1 and 64
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

-- Deletes every conversation (and, by cascade, message) the caller owns.
create or replace function public.delete_all_conversations()
returns void
language sql
set search_path = ''
as $$
  delete from public.conversations where user_id = (select auth.uid());
$$;

-- Permanently deletes the caller's account; all owned rows cascade.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- Function privileges: authenticated callers only.
revoke all on function public.get_provider_secret(text) from public, anon;
revoke all on function public.search_conversations(text, integer) from public, anon;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
revoke all on function public.delete_all_conversations() from public, anon;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.get_provider_secret(text) to authenticated;
grant execute on function public.search_conversations(text, integer) to authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.delete_all_conversations() to authenticated;
grant execute on function public.delete_own_account() to authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.touch_conversation() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
