# Voice Synth Libraries Comparison

A small single-page React app for **comparing JavaScript voice-synthesis (TTS) libraries** side by side. You type a phrase once at the top, and each section speaks that same phrase through a different library — so you can hear the differences using identical input.

Built with **Vite + React + TypeScript** and **pnpm**.

## Libraries compared

| Section                    | Library                                                                                     | Mode here             | Notes                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| EasySpeech                 | [`easy-speech`](https://github.com/leaonline/easy-speech)                                   | Web Speech            | Modern, typed wrapper around the native Web Speech API. Supports voice, rate, pitch, volume.                                                |
| Speak-TTS                  | [`speak-tts`](https://github.com/tom-s/speak-tts)                                           | Web Speech            | Promise-based Web Speech wrapper. Selects voices by name. Supports voice, rate, pitch, volume.                                              |
| Artyom.js                  | [`artyom.js`](https://github.com/sdkcarlos/artyom.js)                                       | Web Speech            | Older assistant library. Selects voices **by language**, honors rate/volume (no pitch).                                                     |
| Talkify                    | [`Talkify`](https://github.com/Hagsten/Talkify)                                             | Browser (Html5)       | Loaded from the Talkify **CDN**; runs on Web Speech. Supports voice + rate.                                                                 |
| Capacitor Speech Synthesis | [`@capgo/capacitor-speech-synthesis`](https://github.com/Cap-go/capacitor-speech-synthesis) | Web Speech (fallback) | Capacitor plugin: native TTS on iOS/Android, Web Speech on the web. Event-based (start/end/error) API; supports voice, rate, pitch, volume. |

## Design notes

- **Shared, normalized controls.** Every section renders the same control surface (voice/language, rate, pitch, volume) via one `Controls` component, but each section **hides the controls its library doesn't support** so the comparison stays honest. The mapping for each library lives in its adapter under `src/synth/adapters/`.
- **Shared phrase, per-section voice.** The text box is global; voice/rate/pitch/volume are per section.
- **Lazy, isolated loading.** Each library is dynamically imported only when its section mounts, and each section is wrapped in an error boundary so a failure in one (legacy) library can't break the page.
- **Talkify is loaded from CDN, not npm.** The `talkify` package on npm is an unrelated chatbot framework — the real Talkify (by Hagsten) is distributed via `cdn.talkify.net`, so it's loaded as a global script at runtime.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open the printed local URL (default http://localhost:5173).

### Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Start the Vite dev server.           |
| `pnpm build`        | Type-check and build for production. |
| `pnpm preview`      | Preview the production build.        |
| `pnpm lint`         | Run oxlint.                          |
| `pnpm format`       | Format with Prettier.                |
| `pnpm format:check` | Check formatting without writing.    |

## Project structure

```
src/
  components/        Controls, SynthSection, ErrorBoundary
  synth/
    adapters/        One adapter per library, mapping the shared config onto each API
    registry.ts      The list of sections rendered on the page
    types.ts         Normalized SynthConfig / SynthAdapter interfaces
    browserVoices.ts Async Web Speech voice-list loading helper
    loadScript.ts    CDN <script> loader (used by Talkify)
  App.tsx            The single page: shared text box + grid of sections
```

## Caveats

- These libraries (in the modes used here) all rely on the browser's **Web Speech API**. The available voices depend on your **operating system and browser**, and the voice list loads asynchronously — the app waits for it before populating the dropdowns.
- For the most consistent voice selection, **Chrome** tends to expose the richest set of voices (including Google voices).
- Talkify also offers **premium cloud / neural voices**, but those require an API key and are intentionally **out of scope** for this POC — only its free browser mode is used.
- Audio playback requires a user gesture in most browsers; just click **Play**.

### Alternativas

- https://www.assemblyai.com
- https://deepgram.com
- https://elevenlabs.io
