-- Signed-in users could previously write every column of their own rows through the
-- Data API. RLS already confines them to their own data; these grants additionally
-- make structural columns immutable, so ids, ownership, roles, ordering and
-- timestamps can only ever come from defaults, identities and triggers.
--
-- Each list is exactly what the app writes (browser and server alike: the server
-- acts as the signed-in user, never with a service key).

-- conversations: created by /api/chat; renamed, moved and re-modelled later.
-- last_message_at is set by the messages_touch_conversation trigger, which runs
-- with the caller's privileges.
revoke insert, update on public.conversations from authenticated;
grant insert (title, project_id, provider_id, model_id) on public.conversations to authenticated;
grant update (title, project_id, provider_id, model_id, last_message_at) on public.conversations to authenticated;

-- messages: written by /api/chat (a reply's id is chosen up front so it can be
-- streamed); afterwards only a reply's own fields (Continue) and feedback change.
revoke insert, update on public.messages from authenticated;
grant insert (id, conversation_id, role, content, attachments, reasoning, status, provider_id, model_id, finish_reason, usage, error)
  on public.messages to authenticated;
grant update (content, reasoning, status, provider_id, model_id, finish_reason, usage, error, feedback)
  on public.messages to authenticated;

-- projects
revoke insert, update on public.projects from authenticated;
grant insert (name, description, instructions) on public.projects to authenticated;
grant update (name, description, instructions) on public.projects to authenticated;

-- profiles and user_settings rows are created by private.handle_new_user on sign-up.
revoke insert, update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

revoke insert, update on public.user_settings from authenticated;
grant update (nickname, about_me, custom_instructions, response_style, theme, text_size, send_on_enter, show_reasoning, default_provider, default_model)
  on public.user_settings to authenticated;
