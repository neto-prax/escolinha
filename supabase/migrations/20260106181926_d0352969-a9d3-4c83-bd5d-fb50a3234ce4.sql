-- Create many-to-many relationship between instances and sectors
CREATE TABLE public.instance_sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.evolution_instances(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id, sector_id)
);

-- Enable RLS
ALTER TABLE public.instance_sectors ENABLE ROW LEVEL SECURITY;

-- Policies for instance_sectors
CREATE POLICY "Users can view instance sectors of their school"
ON public.instance_sectors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.evolution_instances ei
    WHERE ei.id = instance_id
    AND ei.school_id = public.get_user_school_id(auth.uid())
  )
);

CREATE POLICY "Directors can manage instance sectors"
ON public.instance_sectors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.evolution_instances ei
    WHERE ei.id = instance_id
    AND ei.school_id = public.get_user_school_id(auth.uid())
  )
  AND public.is_director(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.evolution_instances ei
    WHERE ei.id = instance_id
    AND ei.school_id = public.get_user_school_id(auth.uid())
  )
  AND public.is_director(auth.uid())
);