// backend/api/chat.js
// Deploy this folder to Vercel. Your OpenAI key stays here — never in the app.

import OpenAI from "openai";
import { buildSystemPrompt } from "../../src/lib/prompts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // Allow requests from Expo app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { messages, candidateContext } = req.body;

  if (!messages || !candidateContext) {
    return res.status(400).json({ error: "Missing messages or candidateContext" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(candidateContext) },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 700,
    });

    const reply = completion.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: "AI call failed" });
  }
}
