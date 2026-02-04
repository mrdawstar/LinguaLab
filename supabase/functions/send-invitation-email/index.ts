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
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'Server configuration error - RESEND_API_KEY not set' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: 'Bad Request - Invalid JSON' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, role, token: inviteToken, invitedBy, schoolName }: InvitationEmailRequest = requestBody;
    
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
    
    // Get school name if not provided
    let finalSchoolName = schoolName;
    if (!finalSchoolName && invitation.school_id) {
      try {
        // Try using the authenticated client first (works if user has access to school)
        const { data: schoolData } = await supabaseClient
          .from('schools')
          .select('name')
          .eq('id', invitation.school_id)
          .single();
        
        if (schoolData?.name) {
          finalSchoolName = schoolData.name;
        } else {
          // Fallback: try with service role key if available
          const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          if (serviceRoleKey) {
            const supabaseService = createClient(
              Deno.env.get('SUPABASE_URL')!,
              serviceRoleKey,
              { auth: { persistSession: false } }
            );
            
            const { data: schoolDataService } = await supabaseService
              .from('schools')
              .select('name')
              .eq('id', invitation.school_id)
              .single();
            
            if (schoolDataService?.name) {
              finalSchoolName = schoolDataService.name;
            }
          }
        }
      } catch (schoolError) {
        console.error("Error fetching school name:", schoolError);
        // Continue without school name - it's optional
      }
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
        from: finalSchoolName ? `${finalSchoolName} via LinguaLab <onboarding@resend.dev>` : "LinguaLab <onboarding@resend.dev>",
        to: [email],
        subject: finalSchoolName 
          ? `Zaproszenie do ${finalSchoolName} - ${getRoleName(role)}`
          : `Zaproszenie do LinguaLab - ${getRoleName(role)}`,
        html: `
          <!DOCTYPE html>
          <html lang="pl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 32px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🎓 LinguaLab</h1>
                        <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 16px; font-weight: 500;">System zarządzania szkołą językową</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 32px;">
                        <h2 style="color: #1e293b; margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Witaj!</h2>
                        
                        <p style="color: #475569; margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
                          Zostałeś zaproszony do dołączenia do platformy LinguaLab${finalSchoolName ? ` w szkole <strong style="color: #1e293b;">${finalSchoolName}</strong>` : ''} jako <strong style="color: #6366f1;">${getRoleName(role)}</strong>.
                        </p>
                        
                        <div style="background: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 8px; padding: 16px; margin: 24px 0;">
                          <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.5;">
                            <strong style="color: #1e293b;">Zaproszenie wysłane przez:</strong><br>
                            ${invitedBy}
                          </p>
                        </div>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: transform 0.2s;">
                                ✨ Dołącz teraz
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Warning Box -->
                        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
                          <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                            ⏰ <strong>Uwaga:</strong> To zaproszenie wygaśnie za 7 dni. Kliknij przycisk powyżej, aby dołączyć.
                          </p>
                        </div>
                        
                        <!-- Alternative Link -->
                        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                          <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0; line-height: 1.5;">
                            Jeśli nie możesz kliknąć przycisku powyżej, skopiuj i wklej poniższy link w przeglądarce:
                          </p>
                          <p style="color: #6366f1; font-size: 13px; word-break: break-all; margin: 0; padding: 12px; background: #f8fafc; border-radius: 6px; font-family: 'Courier New', monospace;">
                            ${inviteLink}
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
                          Jeśli nie oczekiwałeś tego zaproszenia, możesz bezpiecznie zignorować tę wiadomość.<br>
                          <span style="color: #cbd5e1;">© ${new Date().getFullYear()} LinguaLab. Wszystkie prawa zastrzeżone.</span>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
