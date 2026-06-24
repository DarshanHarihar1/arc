// cleanup-subscriptions: daily cron job that test-pings every stored push
// subscription and removes any that reply with 404/410 (revoked or expired).
// The reminder-dispatch already prunes on push failures, but this catches
// subscriptions that haven't been pinged recently.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders as cors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:reminders@arc.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const { data: subs, error } = await service
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let removed = 0;
  let kept = 0;

  for (const sub of subs ?? []) {
    try {
      // Send a silent ping (empty payload). A live subscription returns 201;
      // a dead one returns 404 or 410.
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        "",
      );
      kept++;
    } catch (err: unknown) {
      const e = err as { statusCode?: number };
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await service.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        removed++;
      } else {
        // Transient error — leave it alone.
        kept++;
      }
    }
  }

  return new Response(JSON.stringify({ removed, kept }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
