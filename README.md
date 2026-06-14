# AI Interviewer — Android App

Voice-based AI interview coach built with React Native + Expo.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Fill in your API keys
#    Open .env and replace the placeholder values

# 3. Run on your Android phone
#    Install "Expo Go" from the Play Store on your phone, then:
npx expo start
#    Scan the QR code shown in the terminal
```

## Project structure

```
ai-interviewer/
├── App.jsx                         ← Root navigation
├── src/
│   ├── screens/
│   │   ├── OnboardingScreen.jsx    ← Set role, company, JD
│   │   ├── InterviewScreen.jsx     ← Voice interview UI
│   │   └── ReportScreen.jsx        ← Score + feedback
│   ├── hooks/
│   │   └── useVoice.js             ← Mic recording
│   └── lib/
│       ├── openai.js               ← Calls backend API
│       ├── deepgram.js             ← Audio → text
│       ├── supabase.js             ← Auth + DB
│       └── prompts.js              ← AI system prompt
└── backend/
    └── api/
        └── chat.js                 ← Deploy to Vercel
```

## API keys you need

| Key | Where to get it |
|-----|----------------|
| `EXPO_PUBLIC_DEEPGRAM_KEY` | console.deepgram.com (free tier available) |
| `EXPO_PUBLIC_SUPABASE_URL` + `ANON_KEY` | supabase.com → your project → Settings → API |
| `OPENAI_API_KEY` | platform.openai.com → API keys (set in Vercel, not here) |

## Deploy the backend

```bash
cd backend
npx vercel --prod
# Copy the URL it gives you into EXPO_PUBLIC_API_URL in .env
```

## Build for Google Play

```bash
npm install -g eas-cli
eas build --platform android --profile production
```
