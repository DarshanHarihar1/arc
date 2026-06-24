// reminder-dispatch (§4.5.2): the core scheduler. Called every minute by pg_cron
// (authenticated with the shared CRON_SECRET). For each active reminder due now in
// its owner's timezone, it claims a dispatch-log row (idempotency), ensures a
// pending medication dose where relevant, and sends Web Push to the user's devices.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { isDue } from "../_shared/reminders.ts";

const DEFAULT_TZ = "Asia/Kolkata";

Deno.serve(async (req) => {
  // Cron→function auth: a shared bearer secret, never a Supabase JWT.
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:reminders@arc.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const now = new Date();

  const { data: reminders, error: remErr } = await service
    .from("reminders")
    .select(
      "id,user_id,kind,title,body,time_of_day,days_of_week,deep_link,ref_id",
    )
    .eq("active", true);
  if (remErr) {
    return new Response(JSON.stringify({ error: remErr.message }), { status: 500 });
  }

  // Map user_id -> timezone (reminders and profiles both key off auth.users.id).
  const userIds = [...new Set((reminders ?? []).map((r) => r.user_id))];
  const tzByUser = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id,timezone")
      .in("id", userIds);
    for (const p of profiles ?? []) tzByUser.set(p.id, p.timezone ?? DEFAULT_TZ);
  }

  let sent = 0;
  let claimed = 0;

  for (const r of reminders ?? []) {
    const tz = tzByUser.get(r.user_id) ?? DEFAULT_TZ;
    const { due, fireInstant } = isDue(
      { time_of_day: r.time_of_day, days_of_week: r.days_of_week },
      now,
      tz,
    );
    if (!due) continue;

    const firedFor = fireInstant.toISOString();

    // Claim the (reminder_id, fired_for) slot first. The unique constraint makes
    // this the idempotency gate: a double-firing cron loses the race and skips.
    const { error: claimErr } = await service
      .from("reminder_dispatch_log")
      .insert({ reminder_id: r.id, user_id: r.user_id, fired_for: firedFor });
    if (claimErr) {
      if (claimErr.code === "23505") continue; // already dispatched this instant
      console.error("dispatch-log insert failed", claimErr);
      continue;
    }
    claimed++;

    // Medication reminders pre-create a pending dose so the deep-linked screen
    // can show a one-tap Taken/Skipped.
    if (r.kind === "medication" && r.ref_id) {
      await service.from("medication_logs").upsert(
        {
          user_id: r.user_id,
          medication_id: r.ref_id,
          scheduled_for: firedFor,
          status: "pending",
        },
        { onConflict: "medication_id,scheduled_for", ignoreDuplicates: true },
      );
    }

    const { data: subs } = await service
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", r.user_id);

    const payload = JSON.stringify({
      title: r.title,
      body: r.body ?? "",
      url: r.deep_link ?? "/",
      tag: r.kind,
    });

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          // Expired/gone subscription — prune it.
          await service.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("web push failed", code, err);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, claimed, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
