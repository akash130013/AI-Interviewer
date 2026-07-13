const { getUserFromRequest } = require("../lib/auth");
const { allowRequest } = require("../lib/ratelimit");

// Keeps the Deepgram key server-side. Client uploads raw m4a bytes with
// Content-Type: application/octet-stream (Vercel gives us a Buffer).

const RATE_LIMIT = 60; // recordings per hour per user
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB guard (Vercel caps ~4.5MB anyway)

const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true";

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (!allowRequest(`${user.id}:stt`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return res.status(429).json({ error: "Too many requests — please try again later" });
  }

  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) {
    return res.status(500).json({ error: "DEEPGRAM_API_KEY not set in Vercel environment variables" });
  }

  try {
    const audio = Buffer.isBuffer(req.body) ? req.body : await readRawBody(req);

    if (!audio || audio.length < 1000) {
      return res.status(400).json({ error: "Audio too small or missing" });
    }
    if (audio.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({ error: "Audio too large" });
    }

    const dgRes = await fetch(DEEPGRAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramKey}`,
        "Content-Type": "audio/m4a",
      },
      body: audio,
    });

    if (!dgRes.ok) {
      const body = await dgRes.text();
      console.error("Deepgram error:", dgRes.status, body);
      return res.status(502).json({ error: "Transcription service error" });
    }

    const data = await dgRes.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return res.status(200).json({ transcript: transcript.trim() });
  } catch (err) {
    console.error("Transcribe error:", err.message);
    return res.status(500).json({ error: "Transcription failed" });
  }
}

// Disable Vercel's default body parser — audio is raw binary, not JSON,
// and the 1MB default limit silently drops larger recordings.
handler.config = { api: { bodyParser: false } };
module.exports = handler;
