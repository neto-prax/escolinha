CREATE UNIQUE INDEX IF NOT EXISTS evolution_instances_school_name_unique
ON public.evolution_instances (school_id, instance_name);