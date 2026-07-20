import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

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

// Supabase's recommended React Native pattern: refresh tokens only while the
// app is foregrounded. Prevents expired-token hangs when reopening the app.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// ── Session cache ─────────────────────────────────────────────────────────────
// getSession() can hang for 5-30s when the token needs refreshing.
// We cache the session here and update it via onAuthStateChange (which fires
// with INITIAL_SESSION on startup, then TOKEN_REFRESHED when token rotates).
// Screens call getSessionSafe() instead of getSession() — instant return.

let _cachedSession = undefined; // undefined = not yet initialized
const _pendingResolvers = [];

supabase.auth.onAuthStateChange((event, session) => {
  const firstLoad = _cachedSession === undefined;
  _cachedSession = session;
  if (firstLoad) {
    _pendingResolvers.forEach((r) => r(session));
    _pendingResolvers.length = 0;
  }
});

// Returns the cached session immediately, or waits up to 5s for first load.
export async function getSessionSafe() {
  if (_cachedSession !== undefined) return _cachedSession;
  return Promise.race([
    new Promise((r) => _pendingResolvers.push(r)),
    new Promise((r) => setTimeout(() => r(null), 5000)),
  ]);
}

// Subscribe to all auth events. Returns an unsubscribe function.
export function onSessionEvent(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

export async function saveInterview(userId, candidateContext, report) {
  // Embed context into the report JSONB so history cards can show type + skills
  const enrichedReport = {
    ...report,
    interview_type: candidateContext.interviewType || "mixed",
    skills: Array.isArray(candidateContext.skills) ? candidateContext.skills : [],
    quick_mode: candidateContext.quickMode === true,
  };

  const row = {
    user_id: userId,
    role: candidateContext.role,
    company: candidateContext.company || null,
    overall_score: report.overall_score,
    interview_readiness_percent: report.interview_readiness_percent,
    report: enrichedReport,
  };

  // Retry once on transient failure so a completed session isn't lost
  let { error } = await supabase.from("interviews").insert(row);
  if (error) {
    console.error("Failed to save interview (attempt 1):", error.message);
    ({ error } = await supabase.from("interviews").insert(row));
  }
  if (error) {
    console.error("Failed to save interview (attempt 2):", error.message);
    return false;
  }
  return true;
}

export async function deleteAllUserData(userId) {
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;

  // Requires a DELETE RLS policy on profiles (see supabase/rls_hardening.sql).
  // Server-side deletion in /api/delete-account is the authoritative cleanup.
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", userId);
  if (profileError) console.error("Failed to delete profile:", profileError.message);
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
