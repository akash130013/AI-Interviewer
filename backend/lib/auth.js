const { createClient } = require("@supabase/supabase-js");

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the user object, or null if missing/invalid.
 */
async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (_) {
    return null;
  }
}

module.exports = { getUserFromRequest };
