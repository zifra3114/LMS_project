import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  fullName: string;
  email: string;
  role: 'teacher' | 'student';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized - please sign in');
    }

    // Parse request body
    const body: InviteRequest = await req.json();
    const { fullName, email, role } = body;

    // Validate input
    if (!fullName?.trim() || !email?.trim() || !role) {
      throw new Error('Full name, email, and role are required');
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email address');
    }

    if (!['teacher', 'student'].includes(role)) {
      throw new Error('Role must be either "teacher" or "student"');
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users.some(u => u.email === trimmedEmail);

    if (userExists) {
      throw new Error('A user with this email already exists');
    }

    // Create user with admin client (bypasses email confirmation requirement)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      email_confirm: false, // User will confirm via invitation link
      user_metadata: {
        full_name: fullName.trim(),
        role: role,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error('User creation failed - no user returned');
    }

    // Send password reset email (which acts as invitation)
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(trimmedEmail, {
      data: {
        full_name: fullName.trim(),
        role: role,
      },
    });

    if (inviteError) {
      console.error('Invite error:', inviteError);
      // If invite fails, we should delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to send invitation: ${inviteError.message}`);
    }

    // Insert record into appropriate table
    if (role === 'student') {
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          user_id: newUser.user.id,
          email: trimmedEmail,
          full_name: fullName.trim(),
          // course_id and batch_id will be assigned later by admin
        });

      if (studentError) {
        console.error('Student insert error:', studentError);
        // Continue even if this fails - user can still log in
      }
    } else if (role === 'teacher') {
      const { error: teacherError } = await supabaseAdmin
        .from('teachers')
        .insert({
          user_id: newUser.user.id,
          email: trimmedEmail,
          full_name: fullName.trim(),
        });

      if (teacherError) {
        console.error('Teacher insert error:', teacherError);
        // Continue even if this fails - user can still log in
      }
    }

    return new Response(
      JSON.stringify({
        message: `Invitation sent successfully to ${trimmedEmail}`,
        userId: newUser.user.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
