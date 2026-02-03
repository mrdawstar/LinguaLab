// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

interface InvitationEmailRequest {
  email: string;
  role: 'admin' | 'teacher' | 'manager';
  token: string;
  invitedBy: string;
  schoolName?: string;
}

const getRoleName = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    case 'teacher':
      return 'Nauczyciel';
    default:
      return role;
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // 1. Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authentication' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user token using getUser
    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !userData?.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user.id;
    console.log(`Authenticated user: ${userId}`);

    // 2. Verify user has permission to send invitations (admin or manager role)
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !roleData) {
      console.error("Role lookup error:", roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - No role assigned' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!['admin', 'manager'].includes(roleData.role)) {
      console.error(`Insufficient permissions: user role is ${roleData.role}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Insufficient permissions' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`User has role: ${roleData.role}`);

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email, role, token: inviteToken, invitedBy, schoolName }: InvitationEmailRequest = await req.json();
    
    // 3. Validate that the invitation token exists in the database
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('invitations')
      .select('id, email, token, school_id')
      .eq('token', inviteToken)
      .single();

    if (inviteError || !invitation) {
      console.error("Invitation lookup error:", inviteError);
      return new Response(
        JSON.stringify({ error: 'Bad Request - Invalid invitation token' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Verify the invitation email matches the request
    if (invitation.email !== email) {
      console.error(`Email mismatch: invitation email ${invitation.email} != request email ${email}`);
      return new Response(
        JSON.stringify({ error: 'Bad Request - Email mismatch' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending invitation email to: ${email}, role: ${role}`);

    // Get the frontend URL from the request origin or environment variable
    const origin = req.headers.get('origin');
    const frontendUrlFromEnv = Deno.env.get('FRONTEND_URL');
    // Use environment variable, then origin, then fallback to localhost for development
    const frontendUrl = frontendUrlFromEnv || origin || 'http://localhost:8080';
    const inviteLink = `${frontendUrl}/auth?token=${inviteToken}`;
    
    // Send email using Resend API directly
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LinguaLab <onboarding@resend.dev>",
        to: [email],
        subject: `Zaproszenie do LinguaLab - ${getRoleName(role)}`,
        html: `
          <!DOCTYPE html>
          <html lang="pl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎓 LinguaLab</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">System zarządzania szkołą językową</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="color: #1e293b; margin-top: 0;">Witaj!</h2>
              <p style="color: #475569;">
                Zostałeś zaproszony do dołączenia do platformy LinguaLab${schoolName ? ` w szkole <strong>${schoolName}</strong>` : ''} jako <strong>${getRoleName(role)}</strong>.
              </p>
              <p style="color: #475569;">
                Zaproszenie wysłane przez: <strong>${invitedBy}</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Dołącz teraz
              </a>
            </div>
            
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⏰ <strong>Uwaga:</strong> To zaproszenie wygaśnie za 7 dni.
              </p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              Jeśli nie możesz kliknąć przycisku powyżej, skopiuj i wklej poniższy link w przeglądarce:
            </p>
            <p style="color: #6366f1; font-size: 12px; word-break: break-all;">
              ${inviteLink}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              Jeśli nie oczekiwałeś tego zaproszenia, możesz bezpiecznie zignorować tę wiadomość.
            </p>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Resend API error:", errorData);
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailResponse = await res.json();
    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
