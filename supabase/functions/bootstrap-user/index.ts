// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const supabaseClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const user = userData.user;
    const email = user.email ?? null;
    if (!email) {
      return jsonResponse({ error: "User email missing" }, 400);
    }

    const fullName =
      (user.user_metadata?.full_name as string | undefined) ??
      email.split("@")[0];
    const schoolName =
      (user.user_metadata?.school_name as string | undefined) ??
      `${fullName} - szkoła`;

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id, school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.school_id) {
      return jsonResponse({ school_id: profile.school_id });
    }

    const { data: invitation } = await supabaseClient
      .from("invitations")
      .select("id, school_id, role")
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (invitation?.school_id) {
      if (profile) {
        await supabaseClient
          .from("profiles")
          .update({ school_id: invitation.school_id, full_name: fullName })
          .eq("id", user.id);
      } else {
        await supabaseClient
          .from("profiles")
          .insert({
            id: user.id,
            email,
            full_name: fullName,
            school_id: invitation.school_id,
          });
      }

      await supabaseClient.from("user_roles").insert({
        user_id: user.id,
        role: invitation.role,
      });

      if (invitation.role === "teacher") {
        const { data: existingByUser } = await supabaseClient
          .from("teachers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existingByUser) {
          // Already linked
        } else {
          const { data: unlinkedTeachers } = await supabaseClient
            .from("teachers")
            .select("id, email")
            .eq("school_id", invitation.school_id)
            .is("user_id", null);
          const existingUnlinked = (unlinkedTeachers || []).find(
            (t) => t.email && email && t.email.trim().toLowerCase() === email.trim().toLowerCase()
          );
          if (existingUnlinked) {
            await supabaseClient
              .from("teachers")
              .update({ user_id: user.id, name: fullName })
              .eq("id", existingUnlinked.id);
          } else {
            await supabaseClient.from("teachers").insert({
              school_id: invitation.school_id,
              user_id: user.id,
              name: fullName,
              email,
            });
          }
        }
      }

      await supabaseClient
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return jsonResponse({ school_id: invitation.school_id, role: invitation.role });
    }

    const { data: school, error: schoolError } = await supabaseClient
      .from("schools")
      .insert({ name: schoolName })
      .select("id")
      .single();
    if (schoolError || !school?.id) {
      return jsonResponse({ error: schoolError?.message ?? "Failed to create school" }, 500);
    }

    if (profile) {
      await supabaseClient
        .from("profiles")
        .update({ school_id: school.id, full_name: fullName })
        .eq("id", user.id);
    } else {
      await supabaseClient.from("profiles").insert({
        id: user.id,
        email,
        full_name: fullName,
        school_id: school.id,
      });
    }

    await supabaseClient.from("user_roles").insert({
      user_id: user.id,
      role: "admin",
    });

    await supabaseClient.from("school_settings").insert({
      school_id: school.id,
    });

    return jsonResponse({ school_id: school.id, role: "admin" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
