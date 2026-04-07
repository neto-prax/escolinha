import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is authenticated and is director/secretary
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { guardian_id, school_id } = body

    if (!guardian_id || !school_id) {
      return new Response(JSON.stringify({ error: 'guardian_id e school_id são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if access already exists
    const { data: existing } = await supabaseAdmin
      .from('guardian_portal_access')
      .select('id, email')
      .eq('guardian_id', guardian_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Este responsável já possui acesso ao portal', email: existing.email }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get guardian data
    const { data: guardian, error: guardianError } = await supabaseAdmin
      .from('guardians')
      .select('*')
      .eq('id', guardian_id)
      .single()

    if (guardianError || !guardian) {
      return new Response(JSON.stringify({ error: 'Responsável não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!guardian.email) {
      return new Response(JSON.stringify({ error: 'O responsável precisa ter um email cadastrado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate temporary password
    const tempPassword = `Portal@${Math.random().toString(36).slice(-6)}${Math.floor(Math.random() * 100)}`

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: guardian.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: guardian.full_name },
    })

    if (createError) {
      if (createError.message?.includes('already been registered')) {
        // User exists, get their id
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users?.find(u => u.email === guardian.email)
        if (existingUser) {
          // Reset password and create access
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: tempPassword })
          
          // Ensure profile has school_id
          await supabaseAdmin
            .from('profiles')
            .update({ school_id })
            .eq('id', existingUser.id)

          const { error: accessError } = await supabaseAdmin
            .from('guardian_portal_access')
            .insert({
              guardian_id,
              school_id,
              user_id: existingUser.id,
              email: guardian.email,
            })

          if (accessError) throw accessError

          return new Response(JSON.stringify({
            success: true,
            email: guardian.email,
            temporary_password: tempPassword,
            message: 'Acesso criado com sucesso (usuário existente)'
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
      throw createError
    }

    // Set school_id on profile
    await supabaseAdmin
      .from('profiles')
      .update({ school_id })
      .eq('id', newUser.user.id)

    // Create guardian portal access
    const { error: accessError } = await supabaseAdmin
      .from('guardian_portal_access')
      .insert({
        guardian_id,
        school_id,
        user_id: newUser.user.id,
        email: guardian.email,
      })

    if (accessError) throw accessError

    return new Response(JSON.stringify({
      success: true,
      email: guardian.email,
      temporary_password: tempPassword,
      message: 'Acesso criado com sucesso'
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
