ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS last_message text;

UPDATE public.whatsapp_conversations AS conversation
SET last_message = (
  SELECT message.body
  FROM public.whatsapp_messages AS message
  WHERE message.conversation_id = conversation.id
  ORDER BY message.created_at DESC
  LIMIT 1
)
WHERE conversation.last_message IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_external_id_unique
ON public.whatsapp_messages (external_id)
WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_conversations_school_activity_idx
ON public.whatsapp_conversations (school_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_created_idx
ON public.whatsapp_messages (conversation_id, created_at);

COMMENT ON COLUMN public.whatsapp_conversations.last_message IS 'Denormalized latest message preview to avoid repeated message-list scans.';