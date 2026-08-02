// Google Play Real-Time Developer Notifications (RTDN) via Cloud Pub/Sub
// Google sends base64-encoded JSON messages to this endpoint.
// Setup: Play Console → Monetize → Subscriptions → Real-time notifications
//        Point the Pub/Sub push subscription to:
//        https://ai-interviewer-backend-lac.vercel.app/api/subscription-webhook

const { createClient } = require("@supabase/supabase-js");
const { google } = require("googleapis");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PACKAGE_NAME = "com.interviewboat.app";

const TIER_MAP = {
  pro_monthly:    "pro",
  pro_yearly:     "pro",
  elite_monthly:  "elite",
  elite_yearly:   "elite",
};

// Notification types from Google Play
const SUBSCRIPTION_PURCHASED  = 4;
const SUBSCRIPTION_RENEWED     = 2;
const SUBSCRIPTION_CANCELED    = 3;
const SUBSCRIPTION_EXPIRED     = 13;
const SUBSCRIPTION_REVOKED     = 12;
const SUBSCRIPTION_ON_HOLD     = 5;
const SUBSCRIPTION_RESTARTED   = 7;
const SUBSCRIPTION_RECOVERED   = 6;

function getAndroidPublisher() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return google.androidpublisher({ version: "v3", auth });
}

async function updateProfileByToken(purchaseToken, productId, tier, expiresAt) {
  // Look up the user by their stored purchase token
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("subscription_purchase_token", purchaseToken)
    .maybeSingle();

  if (!profile) return; // token not found — first-time webhook before app verified

  await supabase.from("profiles").update({
    subscription_tier: tier,
    subscription_product_id: productId ?? null,
    subscription_expires_at: expiresAt ?? null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", profile.user_id);
}

async function downgradeByToken(purchaseToken) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("subscription_purchase_token", purchaseToken)
    .maybeSingle();

  if (!profile) return;

  await supabase.from("profiles").update({
    subscription_tier: "free",
    subscription_expires_at: null,
    subscription_product_id: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", profile.user_id);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Pub/Sub delivers: { message: { data: "<base64>", messageId, publishTime }, subscription }
    const message = req.body?.message;
    if (!message?.data) return res.status(200).end(); // ack empty

    const decoded = JSON.parse(Buffer.from(message.data, "base64").toString("utf8"));
    const notif = decoded.subscriptionNotification;
    if (!notif) return res.status(200).end(); // not a subscription event

    const { purchaseToken, subscriptionId, notificationType } = notif;

    console.log(`Webhook: productId=${subscriptionId} type=${notificationType}`);

    switch (notificationType) {
      case SUBSCRIPTION_PURCHASED:
      case SUBSCRIPTION_RENEWED:
      case SUBSCRIPTION_RECOVERED:
      case SUBSCRIPTION_RESTARTED: {
        // Verify with Google Play to get fresh expiry
        const publisher = getAndroidPublisher();
        const result = await publisher.purchases.subscriptionsv2.get({
          packageName: PACKAGE_NAME,
          token: purchaseToken,
        });
        const lineItems = result.data.lineItems || [];
        const expiresAt = lineItems[0]?.expiryTime
          ? new Date(lineItems[0].expiryTime).toISOString()
          : null;
        const tier = TIER_MAP[subscriptionId] ?? "free";
        await updateProfileByToken(purchaseToken, subscriptionId, tier, expiresAt);
        break;
      }

      case SUBSCRIPTION_CANCELED:
      case SUBSCRIPTION_ON_HOLD:
        // Still active until expiry — keep tier, just note it
        break;

      case SUBSCRIPTION_EXPIRED:
      case SUBSCRIPTION_REVOKED:
        // Actually expired/revoked — downgrade immediately
        await downgradeByToken(purchaseToken);
        break;
    }

    // Always return 200 to acknowledge receipt, otherwise Google retries
    return res.status(200).end();
  } catch (err) {
    console.error("Webhook error:", err?.message);
    // Still return 200 so Google doesn't retry indefinitely
    return res.status(200).end();
  }
};
