// weekly-review: aggregates the past 7 days of daily_checkins for every user
// and upserts a weekly_reviews row. Called by pg_cron every Sunday evening.
// Also sends an optional "Your week is ready" push to each user's devices.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { cors } from "../_shared/cors.ts";

const DEFAULT_TZ = "Asia/Kolkata";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:reminders@arc.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const now = new Date();

  // Load all active users and their timezones.
  const { data: profiles, error: pErr } = await service.from("profiles").select("id,timezone");
  if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 500 });

  const results: Array<{ user_id: string; status: string }> = [];

  for (const profile of profiles ?? []) {
    const tz: string = profile.timezone ?? DEFAULT_TZ;

    // Determine what "last Sunday" means in the user's timezone.
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const localDate = formatter.format(now);
    // week_start = last Monday (7 days ago relative to today).
    const todayLocal = new Date(localDate);
    const weekStart = new Date(todayLocal);
    weekStart.setDate(todayLocal.getDate() - 6);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Idempotency: skip if a row already exists for this week_start.
    const { data: existing } = await service
      .from("weekly_reviews")
      .select("id")
      .eq("user_id", profile.id)
      .eq("week_start", weekStartStr)
      .maybeSingle();
    if (existing) {
      results.push({ user_id: profile.id, status: "already_exists" });
      continue;
    }

    // Fetch this week's daily_checkins.
    const { data: checkins } = await service
      .from("daily_checkins")
      .select("day,score,workout_done,meals_logged,meds_taken,steps_done,water_done")
      .eq("user_id", profile.id)
      .gte("day", weekStartStr)
      .lte("day", localDate);

    const rows = checkins ?? [];
    const scoredRows = rows.filter((r: { score: number | null }) => r.score != null);
    const avgScore =
      scoredRows.length > 0
        ? Math.round(scoredRows.reduce((s: number, r: { score: number }) => s + r.score, 0) / scoredRows.length * 10) / 10
        : null;

    const summary = {
      days_logged: rows.length,
      green_days: scoredRows.filter((r: { score: number }) => r.score >= 80).length,
      avg_score: avgScore,
      workout_days: rows.filter((r: { workout_done: boolean }) => r.workout_done).length,
    };

    const { error: upsertErr } = await service.from("weekly_reviews").upsert({
      user_id: profile.id,
      week_start: weekStartStr,
      summary,
      avg_score: avgScore,
    });

    if (upsertErr) {
      results.push({ user_id: profile.id, status: `error: ${upsertErr.message}` });
      continue;
    }

    // Optional push notification: "Your week is ready."
    const { data: subs } = await service
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", profile.id);

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Weekly review ready",
            body: avgScore != null
              ? `Your avg score this week: ${avgScore}`
              : "Check in on your week.",
            url: "/review",
          }),
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await service.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    results.push({ user_id: profile.id, status: "done" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
