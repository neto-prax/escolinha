-- Insert a default school for testing
INSERT INTO public.schools (id, name, slug, email)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Escola Demo', 'escola-demo', 'contato@escolademo.com.br')
ON CONFLICT (id) DO NOTHING;

-- Update the user's school_id and add director role
UPDATE public.profiles 
SET school_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE id = 'eb9c94a7-1d9d-485a-a4ef-42ac2f587dc5';

-- Add director role for the user
INSERT INTO public.user_roles (user_id, school_id, role)
VALUES ('eb9c94a7-1d9d-485a-a4ef-42ac2f587dc5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'director')
ON CONFLICT DO NOTHING;