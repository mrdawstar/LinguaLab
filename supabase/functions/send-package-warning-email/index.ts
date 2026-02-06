// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Centralna konfiguracja adresu nadawcy - używa zweryfikowanej domeny lingualab.cloud
const EMAIL_FROM = "LinguaLab <noreply@lingualab.cloud>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  studentIds?: string[];
}

interface StudentWithWarning {
  id: string;
  name: string;
  email: string;
  remaining_lessons: number;
  school_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-package-warning-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "manager"])
      .single();

    if (roleError || !roleData) {
      console.error("Role check failed:", roleError);
      return new Response(JSON.stringify({ error: "Forbidden - Admin or Manager role required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profileData?.school_id) {
      console.error("Profile error:", profileError);
      return new Response(JSON.stringify({ error: "School not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const schoolId = profileData.school_id;

    const { data: schoolData } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();

    const schoolName = schoolData?.name || "Szkoła Językowa";

    const body: NotificationRequest = await req.json().catch(() => ({}));
    
    let query = supabase
      .from("students")
      .select("id, name, email")
      .eq("school_id", schoolId)
      .in("payment_status", ["warning", "no_payment"]);

    if (body.studentIds && body.studentIds.length > 0) {
      query = query.in("id", body.studentIds);
    }

    const { data: students, error: studentsError } = await query;

    if (studentsError) {
      console.error("Students query error:", studentsError);
      return new Response(JSON.stringify({ error: "Failed to fetch students" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!students || students.length === 0) {
      console.log("No students with warning status found");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Brak uczniów wymagających powiadomienia",
        sentCount: 0 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${students.length} students with warning/no_payment status`);

    const studentsWithLessons: StudentWithWarning[] = [];
    
    for (const student of students) {
      const { data: packages } = await supabase
        .from("package_purchases")
        .select("lessons_total, lessons_used")
        .eq("student_id", student.id)
        .eq("status", "active");

      const remainingLessons = packages?.reduce((sum, pkg) => {
        return sum + ((pkg.lessons_total || 0) - (pkg.lessons_used || 0));
      }, 0) || 0;

      studentsWithLessons.push({
        ...student,
        remaining_lessons: remainingLessons,
        school_name: schoolName,
      });
    }

    const emailResults = [];
    let successCount = 0;
    let failCount = 0;

    for (const student of studentsWithLessons) {
      if (!student.email) {
        console.log(`Skipping student ${student.name} - no email`);
        continue;
      }

      try {
        const isNoPayment = student.remaining_lessons === 0;
        const subject = isNoPayment 
          ? `${schoolName} - Twój pakiet się skończył!`
          : `${schoolName} - Została Ci tylko ${student.remaining_lessons} lekcja!`;

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${schoolName}</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Cześć ${student.name}! 👋</h2>
              
              ${isNoPayment ? `
                <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #991b1b; font-weight: 600;">
                    ⚠️ Twój pakiet lekcji się skończył!
                  </p>
                </div>
                <p>Nie masz już dostępnych lekcji w swoim pakiecie. Aby kontynuować naukę, skontaktuj się z nami w celu wykupienia nowego pakietu.</p>
              ` : `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #92400e; font-weight: 600;">
                    ⏰ Została Ci tylko ${student.remaining_lessons} ${student.remaining_lessons === 1 ? 'lekcja' : 'lekcje'}!
                  </p>
                </div>
                <p>Twój pakiet lekcji dobiega końca. Aby nie przerywać nauki, zachęcamy do wykupienia nowego pakietu.</p>
              `}
              
              <p>Jeśli masz jakiekolwiek pytania, nie wahaj się z nami skontaktować!</p>
              
              <p style="margin-top: 30px; color: #666;">
                Pozdrawiamy,<br>
                <strong>Zespół ${schoolName}</strong>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>Ta wiadomość została wysłana automatycznie. Prosimy nie odpowiadać na ten email.</p>
            </div>
          </body>
          </html>
        `;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [student.email],
            subject: subject,
            html: htmlContent,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Resend API error: ${res.status} - ${errorText}`);
        }

        const emailResponse = await res.json();
        console.log(`Email sent to ${student.email}:`, emailResponse);
        emailResults.push({ student: student.name, email: student.email, success: true });
        successCount++;
      } catch (emailError: any) {
        console.error(`Failed to send email to ${student.email}:`, emailError);
        emailResults.push({ student: student.name, email: student.email, success: false, error: emailError.message });
        failCount++;
      }
    }

    console.log(`Email sending complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Wysłano ${successCount} powiadomień${failCount > 0 ? `, ${failCount} nie udało się wysłać` : ''}`,
      sentCount: successCount,
      failedCount: failCount,
      results: emailResults
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-package-warning-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
