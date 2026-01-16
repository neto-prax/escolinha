-- Reset password for super admin user
-- This uses Supabase's auth.users table update capability
-- The password will be: SuperAdmin2024!

-- First, let's update via a service-level operation
-- We need to use the crypt function for password hashing
UPDATE auth.users 
SET 
  encrypted_password = crypt('SuperAdmin2024!', gen_salt('bf')),
  updated_at = now()
WHERE id = 'b336668f-a1de-4ace-928a-43358169cf82';