import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
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
  const { error } = await supabase.from("interviews").insert({
    user_id: userId,
    role: candidateContext.role,
    company: candidateContext.company || null,
    overall_score: report.overall_score,
    interview_readiness_percent: report.interview_readiness_percent,
    report,
  });
  if (error) console.error("Failed to save interview:", error.message);
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
