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
  package_id?: string | null;
  student_id?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing Supabase env");
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = (await req.json()) as Body;
    const packageId = body.package_id || null;
    const targetStudentId = body.student_id || null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!profile?.school_id) {
      throw new Error("No school assigned");
    }

    const schoolId = profile.school_id as string;

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

    const recalcStudentPackages = async (studentId: string) => {
      const { data: packages } = await supabase
        .from("package_purchases")
        .select(
          "id, lessons_total, hours_purchased, purchase_date, status"
        )
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .order("purchase_date", { ascending: true });

      if (!packages || packages.length === 0) return [];

      const { data: attendanceRows } = await supabase
        .from("lesson_attendance")
        .select(
          "id, lesson_id, attended, student_id, lessons:lessons!lesson_id (date, school_id)"
        )
        .eq("student_id", studentId)
        .eq("attended", true);

      const relevant = (attendanceRows || []).filter(
        (row: any) => row.lessons?.school_id === schoolId
      );

      // Sort by lesson date ascending
      relevant.sort((a: any, b: any) => {
        const da = new Date(a.lessons.date).getTime();
        const db = new Date(b.lessons.date).getTime();
        return da - db;
      });

      const updates: any[] = [];

      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const total = getLessonsTotal(pkg);
        if (total <= 0) continue;

        const startDate = pkg.purchase_date;
        const nextPkg = packages[i + 1];
        const endDateExclusive = nextPkg ? nextPkg.purchase_date : null;

        const windowAttendances = relevant.filter((row: any) => {
          const d = row.lessons?.date;
          if (!d) return false;
          if (d < startDate) return false;
          if (endDateExclusive && d >= endDateExclusive) return false;
          return true;
        });

        const used = Math.min(windowAttendances.length, total);
        const remaining = Math.max(total - used, 0);
        const status =
          remaining <= 0 ? "exhausted" : (pkg.status || "active");

        updates.push({
          id: pkg.id,
          lessons_used: used,
          status,
          lessons_total: pkg.lessons_total,
          hours_purchased: pkg.hours_purchased,
        });
      }

      for (const u of updates) {
        await supabase
          .from("package_purchases")
          .update({ lessons_used: u.lessons_used, status: u.status })
          .eq("id", u.id);
      }

      return updates;
    };

    if (packageId) {
      const { data: pkg } = await supabase
        .from("package_purchases")
        .select("id, student_id, school_id")
        .eq("id", packageId)
        .single();

      if (!pkg || pkg.school_id !== schoolId) {
        return new Response(
          JSON.stringify({ error: "Package not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      const updates = await recalcStudentPackages(pkg.student_id);
      return new Response(
        JSON.stringify({ ok: true, updates }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (targetStudentId) {
      const updates = await recalcStudentPackages(targetStudentId);
      return new Response(
        JSON.stringify({ ok: true, updates }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "package_id or student_id required" }),
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("recalculate-package-usage error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

