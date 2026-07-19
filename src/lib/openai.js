import { getSessionSafe } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function sendMessage(messages, candidateContext) {
  const session = await getSessionSafe();

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ messages, candidateContext }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = new Error(`API error: ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const { reply } = await response.json();
    return reply;
  } finally {
    clearTimeout(abortTimer);
  }
}

export function extractReport(text) {
  if (!text) return null;

  // Quick bail-out: if no overall_score key, definitely not a report
  if (!text.includes('"overall_score"')) return null;

  // Try 1: plain JSON
  try {
    const parsed = JSON.parse(text);
    if (parsed.overall_score !== undefined) return parsed;
  } catch (_) {}

  // Try 2: strip markdown fences then parse
  try {
    const stripped = text.replace(/```(?:json)?\n?/g, "").trim();
    const parsed = JSON.parse(stripped);
    if (parsed.overall_score !== undefined) return parsed;
  } catch (_) {}

  // Try 3: extract first {...} block (handles preamble text)
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.overall_score !== undefined) return parsed;
    }
  } catch (_) {}

  return null;
}
