# Spanish Adventure

A personal, browser-based Spanish B1 vocabulary game built from
`Vocabulario_B1.pdf`.

## Content

- 34 open thematic worlds detected from the PDF.
- 555 Spanish vocabulary entries with learner-facing English meanings.
- Source page metadata on every word.
- Full thematic glossary coverage and rich example sentences in the first
  three worlds.
- Spanish is always the prompt/input side; English is the meaning side.

The PDF's thematic glossary provides Spanish vocabulary but intentionally
leaves translations blank. English meanings in this app are derived metadata,
kept separately from game logic in `src/data/worlds.ts`.

## Features

- Bottom-to-top adventure trail with a winding path, searchable worlds,
  stars, current-level glow, and gentle level unlocking.
- Learn, flashcard, multiple-choice quiz, and review modes.
- Incorrect words are weighted more heavily and reintroduced.
- XP, daily streak, stars, completion, and quiz accuracy.
- Versioned `localStorage` persistence.
- Confirmed reset control for clearing all saved progress.
- ElevenLabs Spanish audio with browser `speechSynthesis` fallback.
- Session audio caching so repeated text does not generate twice.
- Persisted browser voice settings with Spanish-locale priority and test audio.
- Responsive desktop and mobile layout.
- Original generated archipelago illustration in `public/adventure-map.png`.

## Architecture

```text
src/
  components/   Shared interface components
  data/         PDF-derived worlds and vocabulary
  engine/       Quiz, review, completion, and star calculations
  screens/      Map, world, learn, flashcard, quiz, and review screens
  state/        Persistence-aware game state
```

## Run

Create `.env.local` from `.env.example` and set the server-only key:

```text
ELEVENLABS_API_KEY=your_api_key
```

The app uses voice ID `MWXF5l2gMPzYdfnzWbHM` with the multilingual model.
The API key is read only by Vite's `/api/tts` middleware and is never included
in the browser bundle. If ElevenLabs is unavailable, pronunciation falls back
to the browser's `es-ES` speech voice.

After changing `.env.local`, stop and restart `npm run dev`. Vite reads
server-only environment variables when the development server starts. The
server terminal logs a shortened key fingerprint, voice ID, model ID, and any
ElevenLabs error body; none of those diagnostics are returned to the browser.

```powershell
npm install
npm run dev
```

Create a production build with:

```powershell
npm run build
```

`npm run preview` also includes the local `/api/tts` middleware. Vercel uses
the matching serverless function in `api/tts.ts`. The ElevenLabs key must not
be placed in a `VITE_` environment variable.

## Deploy To Vercel

Import the GitHub repository into Vercel and use:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Add `ELEVENLABS_API_KEY` in Vercel Project Settings under Environment
Variables. Apply it to Production and Preview, then redeploy. The build
settings and serverless TTS route are configured in `vercel.json` and
`api/tts.ts`.

## Content Schema

```ts
type VocabularyWord = {
  id: string;
  es: string;
  en: string;
  example?: { es: string; en: string };
  sourcePage?: number;
  tags?: string[];
};
```

New PDF vocabulary can be added to a world's `words` array without changing
the learning or quiz engine.
