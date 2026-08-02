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

// Google Play Android Publisher API client using service account credentials
function getAndroidPublisher() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return google.androidpublisher({ version: "v3", auth });
}

async function verifyGooglePlayPurchase(productId, purchaseToken) {
  const publisher = getAndroidPublisher();
  const res = await publisher.purchases.subscriptionsv2.get({
    packageName: PACKAGE_NAME,
    token: purchaseToken,
  });
  return res.data;
}

function getExpiryFromSubscription(subscriptionData) {
  // subscriptionsv2 returns lineItems with expiryTime
  const lineItems = subscriptionData.lineItems || [];
  if (lineItems.length > 0 && lineItems[0].expiryTime) {
    return new Date(lineItems[0].expiryTime).toISOString();
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth: verify JWT and get user
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { purchaseToken, productId } = req.body || {};
  if (!purchaseToken || !productId) {
    return res.status(400).json({ error: "purchaseToken and productId are required" });
  }

  const tier = TIER_MAP[productId];
  if (!tier) return res.status(400).json({ error: "Unknown productId" });

  try {
    // Verify with Google Play
    const subscriptionData = await verifyGooglePlayPurchase(productId, purchaseToken);
    const expiresAt = getExpiryFromSubscription(subscriptionData);

    // Update profile in Supabase
    const { error: updateError } = await supabase.from("profiles").update({
      subscription_tier: tier,
      subscription_product_id: productId,
      subscription_expires_at: expiresAt,
      subscription_purchase_token: purchaseToken,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({ tier, expiresAt });
  } catch (err) {
    console.error("verify-purchase error:", err?.message);
    return res.status(500).json({ error: err?.message || "Verification failed" });
  }
};
