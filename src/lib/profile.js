import { supabase } from "./supabase";

export async function getProfile(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) { console.error("getProfile error:", error.message); return null; }
    return data;
  } catch (e) {
    console.error("getProfile exception:", e?.message);
    return null;
  }
}

export async function saveProfile(userId, { jobCategory, skills = [], setupDone = true }) {
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      job_category: jobCategory,
      skills,
      setup_done: setupDone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}
