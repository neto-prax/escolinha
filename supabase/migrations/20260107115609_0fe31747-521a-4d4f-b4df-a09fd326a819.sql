-- Enable realtime for whatsapp_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- Enable realtime for whatsapp_conversations table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;