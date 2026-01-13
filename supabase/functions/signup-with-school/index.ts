import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { 
      email, 
      password, 
      full_name, 
      phone,
      school_name,
      school_slug,
      school_address,
      school_phone,
      school_email 
    } = await req.json();

    // Validate required fields
    if (!email || !password || !full_name || !school_name) {
      throw new Error('Campos obrigatórios: email, password, full_name, school_name');
    }

    // Generate slug from school name if not provided
    const slug = school_slug || school_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const { data: existingSchool } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSchool) {
      throw new Error('Já existe uma escola com este nome. Por favor, escolha outro nome.');
    }

    // Create user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        throw new Error('Este email já está cadastrado. Tente fazer login.');
      }
      throw createError;
    }

    console.log('User created:', newUser.user.id);

    // Create school
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: school_name,
        slug,
        address: school_address || null,
        phone: school_phone || null,
        email: school_email || email,
      })
      .select()
      .single();

    if (schoolError) {
      // Rollback: delete the user if school creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      console.error('School creation error:', schoolError);
      throw new Error('Erro ao criar escola. Tente novamente.');
    }

    console.log('School created:', schoolData.id);

    // Update profile with school_id and phone
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        school_id: schoolData.id, 
        phone: phone || null,
        full_name,
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't throw, just log - the user and school are created
    }

    // Add director role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        school_id: schoolData.id,
        role: 'director',
      });

    if (roleError) {
      console.error('Role insert error:', roleError);
      // Don't throw, just log
    }

    console.log('Director role assigned to user:', newUser.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        schoolId: schoolData.id,
        message: 'Conta e escola criadas com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Signup with school error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
