import * as webpush from "jsr:@negrel/webpush@0.5.0";
import postgres from "npm:postgres@3.4.5";

type NotificationRecord = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  target_id: string | null;
  preview: string | null;
};

type DatabaseWebhook = {
  type: "INSERT";
  schema: "public";
  table: "notifications";
  record: NotificationRecord;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!databaseUrl) return json({ error: "The Supabase database connection is unavailable." }, 503);

  const db = postgres(databaseUrl, { max: 1, idle_timeout: 5, connect_timeout: 10 });
  try {
    const secretRows = await db`
      select name, decrypted_secret
      from vault.decrypted_secrets
      where name in ('flexoverse_push_webhook_secret', 'flexoverse_push_vapid_keys')
    `;
    const secrets = new Map(secretRows.map((row: { name: string; decrypted_secret: string }) => [row.name, row.decrypted_secret]));
    const expectedSecret = secrets.get("flexoverse_push_webhook_secret");
    const suppliedSecret = request.headers.get("x-flexoverse-push-secret") || "";
    if (!expectedSecret || suppliedSecret.length !== expectedSecret.length ||
        !crypto.subtle || !constantTimeEqual(suppliedSecret, expectedSecret)) {
      return json({ error: "Unauthorized webhook." }, 401);
    }

    let webhook: DatabaseWebhook;
    try {
      webhook = await request.json();
    } catch {
      return json({ error: "Invalid webhook payload." }, 400);
    }
    if (webhook?.schema !== "public" || webhook?.table !== "notifications" ||
        webhook?.type !== "INSERT" || !webhook.record?.recipient_id || !webhook.record?.id) {
      return json({ error: "Unexpected webhook event." }, 400);
    }

    const notice = webhook.record;
    const isMessage = notice.type === "chat_message" || notice.type === "mention";
    const isCall = notice.type === "incoming_call";
    if (!isMessage && !isCall) return json({ ok: true, skipped: "unsupported_notification_type" });

    const preferences = await db`
      select push_messages, push_calls
      from public.notification_preferences
      where user_id = ${notice.recipient_id}::uuid
      limit 1
    `;
    if (isMessage && preferences[0]?.push_messages === false) return json({ ok: true, skipped: "messages_disabled" });
    if (isCall && preferences[0]?.push_calls === false) return json({ ok: true, skipped: "calls_disabled" });

    const subscriptions = await db`
      select endpoint, p256dh, auth
      from public.push_subscriptions
      where user_id = ${notice.recipient_id}::uuid
    `;
    if (!subscriptions.length) return json({ ok: true, delivered: 0, skipped: "no_subscriptions" });

    const actorRows = notice.actor_id
      ? await db`select coalesce(nullif(full_name, ''), username, 'A Flexoverse member') as name from public.profiles where id = ${notice.actor_id}::uuid limit 1`
      : [];
    const actorName = actorRows[0]?.name || "A Flexoverse member";

    let conversationId: string | null = null;
    let callType = "audio";
    if (notice.target_id) {
      if (isCall) {
        const calls = await db`
          select conversation_id, call_type
          from public.call_history
          where id = ${notice.target_id}::uuid
            and receiver_id = ${notice.recipient_id}::uuid
          limit 1
        `;
        conversationId = calls[0]?.conversation_id || null;
        callType = calls[0]?.call_type || "audio";
      } else {
        const messages = await db`
          select conversation_id
          from public.messages
          where id = ${notice.target_id}::uuid
          limit 1
        `;
        conversationId = messages[0]?.conversation_id || null;
      }
    }

    const title = isCall
      ? (callType === "video" ? "Incoming video call" : "Incoming voice call")
      : isMessage && notice.type === "mention" ? "You were mentioned" : "New message";
    const body = isCall
      ? actorName + " is calling you"
      : String(notice.preview || "Open Flexoverse to read your message").slice(0, 180);
    const payload = JSON.stringify({
      id: notice.id,
      title,
      body,
      url: conversationId ? "/chats/?id=" + encodeURIComponent(conversationId) : "/chats/",
      type: notice.type,
    });

    const vapidJson = secrets.get("flexoverse_push_vapid_keys");
    if (!vapidJson) return json({ error: "The VAPID key pair is missing from Supabase Vault." }, 503);
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(vapidJson));
    const applicationServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:support@agrolystfarms.com",
      vapidKeys,
    });

    let delivered = 0;
    let removed = 0;
    for (const row of subscriptions) {
      const subscriber = applicationServer.subscribe({
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      });
      try {
        await subscriber.pushTextMessage(payload, { ttl: 86400 });
        delivered += 1;
      } catch (error) {
        const gone = typeof (error as { isGone?: () => boolean })?.isGone === "function"
          ? (error as { isGone: () => boolean }).isGone()
          : /\b(404|410)\b/.test(String(error));
        if (gone) {
          await db`delete from public.push_subscriptions where user_id = ${notice.recipient_id}::uuid and endpoint = ${row.endpoint}`;
          removed += 1;
        } else {
          console.error("Web Push delivery failed:", error);
        }
      }
    }
    return json({ ok: true, delivered, removed });
  } catch (error) {
    console.error("Push notification handler failed:", error);
    return json({ error: "Push notification delivery failed." }, 500);
  } finally {
    await db.end({ timeout: 5 }).catch(() => {});
  }
});

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
