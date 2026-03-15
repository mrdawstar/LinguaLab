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
  attendance_id?: string | null; // Opcjonalne - jeśli podane, użyj tego zamiast szukać w bazie
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

    const { lesson_id, student_id, attended, attendance_id } =
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
      .select("id, school_id, date")
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

    // Jeśli attendance_id jest podane, użyj go; w przeciwnym razie znajdź w bazie
    let attendanceId: string | null = attendance_id || null;
    let existingPackageId: string | null = null;
    
    if (attendanceId) {
      // Jeśli mamy attendance_id, pobierz dane o pakiecie z tego rekordu
      const { data: attendance } = await supabase
        .from("lesson_attendance")
        .select("id, package_purchase_id")
        .eq("id", attendanceId)
        .maybeSingle();
      
      existingPackageId = attendance?.package_purchase_id || null;
    } else {
      // Jeśli nie mamy attendance_id, znajdź rekord w bazie
      const { data: attendance } = await supabase
        .from("lesson_attendance")
        .select("id, package_purchase_id")
        .eq("lesson_id", lesson_id)
        .eq("student_id", student_id)
        .maybeSingle();

      attendanceId = attendance?.id ?? null;
      existingPackageId = attendance?.package_purchase_id || null;
    }

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

    const recomputePackageUsage = async (packageId: string) => {
      const { data: pkg } = await supabase
        .from("package_purchases")
        .select("id, lessons_total, hours_purchased, total_amount, price_per_lesson")
        .eq("id", packageId)
        .single();

      if (!pkg?.id) return;

      const { count } = await supabase
        .from("lesson_attendance")
        .select("id", { count: "exact", head: true })
        .eq("package_purchase_id", packageId)
        .eq("attended", true);

      const used = typeof count === "number" ? count : 0;
      const total = getLessonsTotal(pkg);
      const status = total > 0 && used >= total ? "exhausted" : "active";

      await supabase
        .from("package_purchases")
        .update({ lessons_used: used, status })
        .eq("id", packageId);
    };

    const packageStillExists = async (packageId: string) => {
      const { data: pkg } = await supabase
        .from("package_purchases")
        .select("id")
        .eq("id", packageId)
        .maybeSingle();

      return !!pkg?.id;
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
      if (attendanceId) {
        await supabase
          .from("lesson_attendance")
          .update({
            package_purchase_id: null,
            revenue_amount: null,
          })
          .eq("id", attendanceId);
      }

      if (existingPackageId) {
        await recomputePackageUsage(existingPackageId);
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    /* =========================
       MARK ATTENDED
       ========================= */

    // Jeśli nie mamy attendanceId i zaznaczamy obecność, utwórz rekord
    // UWAGA: Jeśli attendance_id było podane w żądaniu, rekord już istnieje (został utworzony przez trigger lub wcześniej)
    if (!attendanceId && attended) {
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

    // If this attendance is already linked to a package, keep that link.
    // This prevents repeated saves/comments from deducting another lesson
    // or moving the same attendance to a different package.
    if (existingPackageId && await packageStillExists(existingPackageId)) {
      await recomputePackageUsage(existingPackageId);

      console.log("apply-package-usage: keeping existing package", {
        attendance_id: attendanceId,
        package_id: existingPackageId,
      });

      return new Response(
        JSON.stringify({ ok: true, package_id: existingPackageId }),
        { status: 200, headers: corsHeaders }
      );
    }

    const { data: packages } = await supabase
      .from("package_purchases")
      .select(
        "id, lessons_total, hours_purchased, total_amount, price_per_lesson, status, purchase_date"
      )
      .eq("school_id", profile.school_id)
      .eq("student_id", student_id)
      .or("status.is.null,status.eq.active")
      .lte("purchase_date", lesson.date)
      .order("purchase_date", { ascending: true });

    let activePackage: any = null;

    for (const pkg of packages || []) {
      const total = getLessonsTotal(pkg);
      if (total <= 0) continue;

      const { count } = await supabase
        .from("lesson_attendance")
        .select("id", { count: "exact", head: true })
        .eq("package_purchase_id", pkg.id)
        .eq("attended", true);

      const used = typeof count === "number" ? count : 0;
      if (used < total) {
        activePackage = pkg;
        break;
      }
    }

    if (!activePackage) {
      console.warn("apply-package-usage: missing package", {
        student_id,
        school_id: profile.school_id,
        lesson_date: lesson.date,
      });
      return new Response(
        JSON.stringify({ ok: true, missing_package: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (attendanceId) {
      await supabase
        .from("lesson_attendance")
        .update({
          package_purchase_id: activePackage.id,
          revenue_amount: getRevenueAmount(activePackage),
        })
        .eq("id", attendanceId);
    }

    await recomputePackageUsage(activePackage.id);

    console.log("apply-package-usage: updated", {
      attendance_id: attendanceId,
      package_id: activePackage.id,
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
