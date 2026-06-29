// src/lib/openai.js
// Calls the Vercel backend which then calls OpenAI.
// The OpenAI API key lives ONLY on the server — never in the app.

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function sendMessage(messages, candidateContext) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, candidateContext }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const { reply } = await response.json();
  return reply;
}

// Returns the parsed report object if the AI sent the final JSON, else null
export function extractReport(text) {
  // Try plain JSON first
  try {
    const parsed = JSON.parse(text);
    if (parsed.overall_score !== undefined) return parsed;
  } catch (_) {}

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  try {
    const stripped = text.replace(/```(?:json)?\n?/g, "").trim();
    const parsed = JSON.parse(stripped);
    if (parsed.overall_score !== undefined) return parsed;
  } catch (_) {}

  // Extract first {...} block from mixed text
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.overall_score !== undefined) return parsed;
    }
  } catch (_) {}

  return null;
}
