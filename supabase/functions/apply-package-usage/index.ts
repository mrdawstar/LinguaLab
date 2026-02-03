// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

type Body = {
  lesson_id: string;
  student_id: string; // MUSI BYĆ students.id
  attended: boolean;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("apply-package-usage: request received");
    /* =========================
       SUPABASE CLIENT
       ========================= */

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing Supabase env");
    }

    // Auth client (JWT) – used only for auth.getUser()
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    // Service role client – DB operations without RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    /* =========================
       AUTH
       ========================= */

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      console.error("apply-package-usage: unauthorized");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    /* =========================
       BODY
       ========================= */

    const { lesson_id, student_id, attended } =
      (await req.json()) as Body;

    if (!lesson_id || !student_id || typeof attended !== "boolean") {
      console.error("apply-package-usage: invalid payload", {
        lesson_id,
        student_id,
        attended,
      });
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: corsHeaders }
      );
    }
    console.log("apply-package-usage: payload", {
      lesson_id,
      student_id,
      attended,
    });

    /* =========================
       SCHOOL CHECK
       ========================= */

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!profile?.school_id) {
      console.error("apply-package-usage: no school for user", user.id);
      throw new Error("No school assigned");
    }

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, school_id")
      .eq("id", lesson_id)
      .single();

    if (!lesson || lesson.school_id !== profile.school_id) {
      console.error("apply-package-usage: forbidden", {
        lesson_school_id: lesson?.school_id,
        profile_school_id: profile.school_id,
      });
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: corsHeaders }
      );
    }

    /* =========================
       ATTENDANCE
       ========================= */

    const { data: attendance } = await supabase
      .from("lesson_attendance")
      .select("id, package_purchase_id")
      .eq("lesson_id", lesson_id)
      .eq("student_id", student_id)
      .maybeSingle();

    let attendanceId = attendance?.id ?? null;

    const toNumber = (value: unknown) => {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const getLessonsTotal = (pkg: any) => {
      const lessonsTotal = toNumber(pkg.lessons_total);
      if (lessonsTotal > 0) return lessonsTotal;
      const hoursPurchased = toNumber(pkg.hours_purchased);
      if (hoursPurchased > 0) return hoursPurchased;
      return 0;
    };

    const getRevenueAmount = (pkg: any) => {
      if (typeof pkg.price_per_lesson === "number") {
        return pkg.price_per_lesson;
      }
      const total = getLessonsTotal(pkg);
      return total > 0 ? toNumber(pkg.total_amount) / total : 0;
    };

    /* =========================
       UNMARK ATTENDANCE
       ========================= */

    if (!attended) {
      console.log("apply-package-usage: unmark attendance");
      if (!attendanceId) {
        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers: corsHeaders }
        );
      }
      if (attendance?.package_purchase_id) {
        const { data: pkg } = await supabase
          .from("package_purchases")
          .select("id, lessons_used, lessons_total, hours_purchased")
          .eq("id", attendance.package_purchase_id)
          .single();

        if (pkg?.id) {
          const newUsed = Math.max(0, toNumber(pkg.lessons_used) - 1);
          const total = getLessonsTotal(pkg);
          const status =
            total > 0 && newUsed >= total ? "exhausted" : "active";

          await supabase
            .from("package_purchases")
            .update({ lessons_used: newUsed, status })
            .eq("id", pkg.id);
        }
      }

      if (attendanceId) {
        await supabase
          .from("lesson_attendance")
          .update({
            package_purchase_id: null,
            revenue_amount: null,
          })
          .eq("id", attendanceId);
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    /* =========================
       MARK ATTENDED
       ========================= */

    if (!attendanceId) {
      const { data: inserted } = await supabase
        .from("lesson_attendance")
        .insert({
          lesson_id,
          student_id,
          attended: true,
        })
        .select("id")
        .single();
      attendanceId = inserted?.id ?? null;
    }

    const { data: packages } = await supabase
      .from("package_purchases")
      .select(
        "id, lessons_total, lessons_used, hours_purchased, total_amount, price_per_lesson, status, created_at"
      )
      .eq("school_id", profile.school_id)
      .eq("student_id", student_id) // ← KLUCZOWE
      .or("status.is.null,status.eq.active")
      .order("created_at", { ascending: true });

    console.log("apply-package-usage: packages found", {
      count: packages?.length ?? 0,
      student_id,
    });

    const activePackage = (packages || []).find((pkg: any) => {
      const total = getLessonsTotal(pkg);
      return total > 0 && toNumber(pkg.lessons_used) < total;
    });

    if (!activePackage) {
      console.warn("apply-package-usage: missing package", {
        student_id,
        school_id: profile.school_id,
      });
      return new Response(
        JSON.stringify({ ok: true, missing_package: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    const newUsed = toNumber(activePackage.lessons_used) + 1;
    const total = getLessonsTotal(activePackage);
    const status =
      newUsed >= total ? "exhausted" : "active";

    await supabase
      .from("package_purchases")
      .update({ lessons_used: newUsed, status })
      .eq("id", activePackage.id);

    if (attendanceId) {
      await supabase
        .from("lesson_attendance")
        .update({
          package_purchase_id: activePackage.id,
          revenue_amount: getRevenueAmount(activePackage),
        })
        .eq("id", attendanceId);
    }
    console.log("apply-package-usage: updated", {
      attendance_id: attendanceId,
      package_id: activePackage.id,
      lessons_used: newUsed,
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("apply-package-usage error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
