# Call Claude

Talk to Claude like a phone call. Tap the green button, speak out loud, and
Claude answers back in a voice — a hands-free conversation in your browser.

Built with Next.js. The voice work happens entirely in your browser using the
built-in **Web Speech API** (speech-to-text for the mic, speech-to-speech for
Claude's replies), so there are no audio servers or extra services to run. A
single API route relays your words to the Claude API.

## How it works

```
You speak  ─▶  browser speech-to-text  ─▶  /api/chat  ─▶  Claude API
   ▲                                                          │
   └────  browser reads it aloud  ◀──  Claude's reply  ◀──────┘
```

## Requirements

- An **Anthropic API key** — get one at https://console.anthropic.com
- A **Chromium or WebKit browser** (Chrome, Edge, or Safari). Firefox does not
  support speech recognition.
- The mic only works over **HTTPS** — `localhost` and Vercel both qualify.

## Run it locally

```bash
npm install
cp .env.example .env.local      # then paste your key into .env.local
npm run dev
```

Open http://localhost:3000 in Chrome, allow the microphone, tap the green
button, and say hello.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com/new and import the repo (Vercel auto-detects
   Next.js — no settings to change).
3. In the project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key
4. Redeploy. Open the live URL in Chrome/Edge/Safari and start talking.

Every future push to the repo auto-deploys.

## Configuration

- **Model**: change `claude-sonnet-4-6` in `app/api/chat/route.ts`.
- **Personality / reply length**: edit `SYSTEM_PROMPT` in the same file.
- **Voice language**: change `recognition.lang` in `lib/speech.ts`.

## Project layout

```
app/
  page.tsx            the call screen + call loop
  layout.tsx          root layout
  globals.css         styling
  api/chat/route.ts   relays the conversation to Claude
lib/
  speech.ts           Web Speech API wrappers
```

Your API key is read from the environment on the server and is never sent to the
browser or committed to the repo.
