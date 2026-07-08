const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

  const token = authHeader.replace("Bearer ", "");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });
  }

  const admin = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify the token and extract user
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    // Delete all user interview data first
    await admin.from("interviews").delete().eq("user_id", user.id);

    // Delete the auth user
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
