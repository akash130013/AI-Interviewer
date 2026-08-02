import { supabase, getSessionSafe } from "./supabase";

// Product IDs — must match exactly what is created in Play Console
export const PRODUCTS = {
  PRO_MONTHLY:    "pro_monthly",
  PRO_YEARLY:     "pro_yearly",
  ELITE_MONTHLY:  "elite_monthly",
  ELITE_YEARLY:   "elite_yearly",
};

export const PRO_PRODUCTS   = [PRODUCTS.PRO_MONTHLY,   PRODUCTS.PRO_YEARLY];
export const ELITE_PRODUCTS = [PRODUCTS.ELITE_MONTHLY, PRODUCTS.ELITE_YEARLY];
export const ALL_PRODUCTS   = [...PRO_PRODUCTS, ...ELITE_PRODUCTS];

// Free tier limits
export const FREE_INTERVIEWS_PER_MONTH = 3;

// ── Read subscription tier from profile ───────────────────────────────────────

export async function getSubscriptionTier(userId) {
  if (!userId) return "free";
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return "free";

    // Treat expired subscriptions as free
    if (data.subscription_expires_at) {
      const expired = new Date(data.subscription_expires_at) < new Date();
      if (expired) return "free";
    }

    return data.subscription_tier ?? "free";
  } catch {
    return "free";
  }
}

export function isPro(tier)   { return tier === "pro"   || tier === "elite"; }
export function isElite(tier) { return tier === "elite"; }

// ── Interview count gating (free tier: 3/month) ───────────────────────────────

export async function getInterviewsUsedThisMonth(userId) {
  if (!userId) return 0;
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString());

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function canStartInterview(userId) {
  const tier = await getSubscriptionTier(userId);
  if (isPro(tier)) return { allowed: true, tier, used: 0, limit: Infinity };

  const used = await getInterviewsUsedThisMonth(userId);
  const allowed = used < FREE_INTERVIEWS_PER_MONTH;
  return { allowed, tier, used, limit: FREE_INTERVIEWS_PER_MONTH };
}

// ── Save purchase to Supabase after backend verification ──────────────────────

export async function savePurchaseLocally(userId, productId, tier, expiresAt, purchaseToken) {
  await supabase.from("profiles").update({
    subscription_tier: tier,
    subscription_product_id: productId,
    subscription_expires_at: expiresAt,
    subscription_purchase_token: purchaseToken,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
}

// ── Verify purchase with backend and update profile ───────────────────────────

export async function verifyAndActivate(purchaseToken, productId) {
  const session = await getSessionSafe();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/verify-purchase`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ purchaseToken, productId }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Verification failed (${res.status})`);
  }

  const data = await res.json();
  return data; // { tier, expiresAt }
}
