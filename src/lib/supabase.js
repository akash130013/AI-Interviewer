// src/lib/supabase.js
// Supabase client — used for auth and saving interview history

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Save a completed interview + report to the database
export async function saveInterview(userId, candidateContext, report) {
  const { data, error } = await supabase.from("interviews").insert({
    user_id: userId,
    role: candidateContext.role,
    company: candidateContext.company,
    completed: true,
    report,
  });
  if (error) console.error("Failed to save interview:", error);
  return data;
}

// Fetch all past interviews for the current user
export async function getPastInterviews(userId) {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) console.error("Failed to fetch interviews:", error);
  return data ?? [];
}
