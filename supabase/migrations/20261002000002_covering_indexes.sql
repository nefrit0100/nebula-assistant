-- Reshape the hot-path indexes so they also cover the composite (parent, user_id)
-- foreign keys. The RLS predicate adds user_id = auth.uid() to every query, so the
-- (parent_id, user_id, sort_key) order serves both the FK checks and the paginated reads.

drop index if exists public.messages_conversation_seq_idx;
create index messages_conversation_user_seq_idx
  on public.messages (conversation_id, user_id, seq);

drop index if exists public.conversations_project_recent_idx;
create index conversations_project_user_recent_idx
  on public.conversations (project_id, user_id, last_message_at desc)
  where project_id is not null;
