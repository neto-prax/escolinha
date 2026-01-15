-- Add display_name column to evolution_instances
ALTER TABLE public.evolution_instances 
ADD COLUMN display_name text;

-- Set existing display_name to instance_name for existing records
UPDATE public.evolution_instances 
SET display_name = instance_name 
WHERE display_name IS NULL;