import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is a super admin
    const { data: superAdmin, error: saError } = await supabaseAdmin
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (saError || !superAdmin) {
      return new Response(
        JSON.stringify({ error: "Access denied. Super admin privileges required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "list_schools": {
        const { data: schools, error } = await supabaseAdmin
          .from("schools")
          .select(`
            id,
            name,
            slug,
            logo_url,
            address,
            phone,
            email,
            settings,
            created_at,
            updated_at
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Get counts for each school
        const schoolsWithCounts = await Promise.all(
          schools.map(async (school) => {
            const [usersResult, studentsResult] = await Promise.all([
              supabaseAdmin
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .eq("school_id", school.id),
              supabaseAdmin
                .from("students")
                .select("id", { count: "exact", head: true })
                .eq("school_id", school.id),
            ]);

            return {
              ...school,
              user_count: usersResult.count || 0,
              student_count: studentsResult.count || 0,
            };
          })
        );

        return new Response(
          JSON.stringify({ schools: schoolsWithCounts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_users": {
        const { schoolId } = params;
        
        let query = supabaseAdmin
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            avatar_url,
            is_active,
            school_id,
            created_at,
            schools!profiles_school_id_fkey(name)
          `)
          .order("created_at", { ascending: false });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (schoolId) {
          query = query.eq("school_id", schoolId);
        }

        const { data: users, error } = await query;
        if (error) throw error;

        // Get roles for each user
        const usersWithRoles = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          users.map(async (userRecord: any) => {
            const { data: roles } = await supabaseAdmin
              .from("user_roles")
              .select("role")
              .eq("user_id", userRecord.id);

            // Get email from auth
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userRecord.id);

            return {
              ...userRecord,
              email: authUser?.user?.email || null,
              roles: roles?.map((r: { role: string }) => r.role) || [],
              school_name: userRecord.schools?.[0]?.name || null,
            };
          })
        );

        return new Response(
          JSON.stringify({ users: usersWithRoles }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { userId, newPassword } = params;

        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: "userId and newPassword are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: "Password must be at least 6 characters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        );

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_school": {
        const { schoolId } = params;

        if (!schoolId) {
          return new Response(
            JSON.stringify({ error: "schoolId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get all users from this school
        const { data: schoolUsers } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("school_id", schoolId);

        // Delete users from auth (this will cascade to profiles due to trigger)
        if (schoolUsers && schoolUsers.length > 0) {
          for (const schoolUser of schoolUsers) {
            await supabaseAdmin.auth.admin.deleteUser(schoolUser.id);
          }
        }

        // Delete the school (cascades will handle related data)
        const { error: deleteError } = await supabaseAdmin
          .from("schools")
          .delete()
          .eq("id", schoolId);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_school_settings": {
        const { schoolId, settings } = params;

        if (!schoolId) {
          return new Response(
            JSON.stringify({ error: "schoolId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current settings
        const { data: school } = await supabaseAdmin
          .from("schools")
          .select("settings")
          .eq("id", schoolId)
          .single();

        const currentSettings = school?.settings || {};
        const newSettings = { ...currentSettings, ...settings };

        const { error: updateError } = await supabaseAdmin
          .from("schools")
          .update({ settings: newSettings })
          .eq("id", schoolId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, settings: newSettings }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "toggle_user_active": {
        const { userId, isActive } = params;

        if (!userId || isActive === undefined) {
          return new Response(
            JSON.stringify({ error: "userId and isActive are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ is_active: isActive })
          .eq("id", userId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Super admin function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
