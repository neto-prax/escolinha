-- Add device_name column to contacts table for storing the name as it appears on the phone/WhatsApp
ALTER TABLE public.contacts 
ADD COLUMN device_name text;

-- Add comment to explain the column
COMMENT ON COLUMN public.contacts.device_name IS 'Name as saved on the phone/WhatsApp device';