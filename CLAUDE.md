# AI Interviewer — Project Context for Claude

This file gives Claude full context about this project so it can assist effectively.

---

## What we are building

A voice-based AI interview coach Android app. Users practice job interviews by speaking
with an AI interviewer named "Alex" who asks adaptive questions, scores answers, and
generates a detailed report at the end.

## Why we built it this way

- **Target users**: Job seekers, especially software developers
- **Key insight**: Every competitor (Final Round AI, Yoodli, Interview Warmup) either
  has no adaptive difficulty, is too expensive ($24–225), or is not built for daily practice
- **Monetization**: $9.99/month subscription. Free tier = 3 interviews/month
- **Revenue target**: $10k/month = ~1,000 subscribers

## Tech stack decisions (and why)

| Choice | Why |
|--------|-----|
| React Native + Expo | Solo dev, JS-based, runs on Android, fastest path to Play Store |
| Deepgram STT | Lowest latency speech-to-text (~nova-2 model) |
| expo-speech | Free built-in TTS for AI to speak questions back |
| OpenAI GPT-4o-mini | Cheap (~$0.08/session), fast, smart enough |
| Supabase | Free tier, handles auth + DB, has row-level security |
| Vercel (backend) | Serverless, free tier, keeps OpenAI key off the device |
| Stripe (later) | Subscription billing (Google Play Billing added later for Play Store) |

## How the voice flow works

```
User taps mic → expo-av records .m4a audio
     ↓
stopRecording() → sends audio to Deepgram API → returns transcript text
     ↓
sendMessage() → POSTs transcript + conversation history to /api/chat on Vercel
     ↓
Vercel calls OpenAI GPT-4o-mini with system prompt → returns reply text
     ↓
expo-speech speaks the reply aloud
     ↓
Both messages added to chat UI
     ↓
Repeat until AI returns report JSON → navigate to ReportScreen
```

## File structure

```
ai-interviewer/
├── App.jsx                         ← Navigation root (Onboarding → Interview → Report)
├── app.json                        ← Expo config, Android permissions (RECORD_AUDIO)
├── package.json                    ← All dependencies
├── .env                            ← API keys (fill these in before running)
├── babel.config.js
│
├── src/
│   ├── screens/
│   │   ├── OnboardingScreen.jsx    ← Form: role, company, years exp, interview type, JD
│   │   ├── InterviewScreen.jsx     ← Main screen: mic button, chat bubbles, AI speaks
│   │   └── ReportScreen.jsx        ← Score, strengths, improvements, per-question breakdown
│   │
│   ├── hooks/
│   │   └── useVoice.js             ← startRecording(), stopRecording() using expo-av
│   │
│   └── lib/
│       ├── openai.js               ← sendMessage(), extractReport()
│       ├── deepgram.js             ← transcribeAudio(fileUri) → transcript string
│       ├── supabase.js             ← saveInterview(), getPastInterviews()
│       └── prompts.js              ← buildSystemPrompt(candidateContext)
│
└── backend/
    └── api/
        └── chat.js                 ← Vercel serverless: POST /api/chat → OpenAI → reply
```

## The AI system prompt (summary)

The prompt in `src/lib/prompts.js` tells GPT to:
- Act as "Alex", a professional interviewer
- Ask 6 questions (2 behavioral, 2 technical/situational, 1 motivation, 1 closing)
- Score each answer 1–5 internally across: clarity, relevance, depth, STAR structure
- Adapt difficulty: 2 consecutive high scores → harder, 2 low → easier
- Never give feedback mid-interview
- Return a specific JSON report object when interview ends

## Environment variables needed

```
EXPO_PUBLIC_SUPABASE_URL         → from supabase.com project settings
EXPO_PUBLIC_SUPABASE_ANON_KEY    → from supabase.com project settings
EXPO_PUBLIC_DEEPGRAM_KEY         → from console.deepgram.com
EXPO_PUBLIC_API_URL              → Vercel deploy URL of the backend folder

# In Vercel dashboard only (never in .env):
OPENAI_API_KEY                   → from platform.openai.com
```

## Current status

- [x] Full project scaffold created
- [x] All screen files written (Onboarding, Interview, Report)
- [x] Voice hooks written (useVoice.js)
- [x] Deepgram integration written
- [x] OpenAI backend written
- [x] System prompt written
- [ ] npm install not yet run
- [ ] API keys not yet filled in
- [ ] Backend not yet deployed to Vercel
- [ ] App not yet tested on device

## Immediate next steps

1. Run `npm install` in the project root
2. Fill in `.env` with real API keys
3. Deploy `backend/` to Vercel and paste the URL into `.env`
4. Run `npx expo start` and test on Android phone via Expo Go app

## Known things to build next (Phase 2+)

- Supabase auth (email + password login)
- Save completed interviews to DB
- Interview history screen (list of past sessions)
- Stripe subscription gate (3 free → paid)
- Google Play Store build via EAS (`eas build --platform android`)
- Progress tracking: "interview readiness %" chart over time
- Company-specific question modes (Amazon STAR, Google L-series)

## Cost per interview session

| Service | Cost |
|---------|------|
| Deepgram STT (20 min) | ~$0.12 |
| GPT-4o-mini (10 questions + report) | ~$0.08 |
| expo-speech TTS | $0.00 (free, built-in) |
| **Total per session** | **~$0.20** |

At $9.99/month with 10 sessions/user/month → ~$2 cost → ~$7.99 margin per user.

## Developer notes

- The `messages` array passed to OpenAI is the full conversation history — never truncate it
  or the AI loses context of what was already asked
- `extractReport()` in openai.js tries to JSON.parse the reply — the AI returns raw JSON
  when the interview ends, not wrapped in markdown
- expo-speech is free but sounds robotic; upgrade to ElevenLabs Flash API for natural voice
  (add `EXPO_PUBLIC_ELEVENLABS_KEY` and replace Speech.speak calls)
- Deepgram free tier gives $200 credit — enough for extensive testing before paying
