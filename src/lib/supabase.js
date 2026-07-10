import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const ExpoSecureStoreAdapter = {
  getItem:    async (key) => { try { return await SecureStore.getItemAsync(key); } catch { return null; } },
  setItem:    async (key, value) => { try { await SecureStore.setItemAsync(key, value); } catch {} },
  removeItem: async (key) => { try { await SecureStore.deleteItemAsync(key); } catch {} },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function saveInterview(userId, candidateContext, report) {
  // Embed context into the report JSONB so history cards can show type + skills
  const enrichedReport = {
    ...report,
    interview_type: candidateContext.interviewType || "mixed",
    skills: Array.isArray(candidateContext.skills) ? candidateContext.skills : [],
    quick_mode: candidateContext.quickMode === true,
  };

  const { error } = await supabase.from("interviews").insert({
    user_id: userId,
    role: candidateContext.role,
    company: candidateContext.company || null,
    overall_score: report.overall_score,
    interview_readiness_percent: report.interview_readiness_percent,
    report: enrichedReport,
  });
  if (error) console.error("Failed to save interview:", error.message);
}

export async function deleteAllUserData(userId) {
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getPastInterviews(userId) {
  const { data, error } = await supabase
    .from("interviews")
    .select("id, role, company, overall_score, interview_readiness_percent, report, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) console.error("Failed to fetch interviews:", error.message);
  return data ?? [];
}
