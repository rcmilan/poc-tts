import { createAudioPlayer } from '../audioPlayer';
import { KOKORO_VOICES } from '../kokoroVoices';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const headTtsMeta: SynthMeta = {
  id: 'headtts',
  name: 'HeadTTS',
  description:
    'In-browser neural TTS running the same Kokoro-82M model, adding phoneme timestamps and ' +
    'Oculus visemes for lip-sync. First Play downloads the ~90 MB model (cached afterward).',
  repoUrl: 'https://github.com/met4citizen/HeadTTS',
};

// ponytail: HeadTTS spins up a module Web Worker from a blob, which can't use
// relative paths, so the worker + phonemizer dictionaries are vendored under
// public/headtts/ and referenced as absolute URLs built from the Vite base path
// (/poc-tts/). The model + voices still stream from Hugging Face. See plan.
const WORKER_MODULE = new URL(
  `${import.meta.env.BASE_URL}headtts/modules/worker-tts.mjs`,
  location.href,
).href;
const DICTIONARY_URL = new URL(`${import.meta.env.BASE_URL}headtts/dictionaries`, location.href)
  .href;

export function createHeadTtsAdapter(): SynthAdapter {
  const player = createAudioPlayer();
  // HeadTTS ships no types; kept behind `any` like the other untyped adapters.
  let engine: any = null;
  let connecting: Promise<any> | null = null;

  function ensure() {
    if (engine) return Promise.resolve(engine);
    if (!connecting) {
      connecting = (async () => {
        const { HeadTTS } = await import('@met4citizen/headtts');
        const h = new HeadTTS({
          endpoints: ['webgpu', 'wasm'],
          languages: ['en-us'],
          workerModule: WORKER_MODULE,
          dictionaryURL: DICTIONARY_URL,
          // HeadTTS defaults the WASM path to q4, whose Kokoro quantization
          // produces static/buzz. Use q8 (what the Kokoro.js adapter uses);
          // WebGPU already defaults to fp32.
          dtypeWasm: 'q8',
        });
        await h.connect();
        engine = h;
        return h;
      })();
    }
    return connecting;
  }

  return {
    supports: { voice: true, langAsVoice: false, rate: true, pitch: false, volume: true },

    async load() {
      // no-op: defer the model download to the first Play.
    },

    async getVoices(): Promise<VoiceOption[]> {
      return KOKORO_VOICES;
    },

    async speak({ text, config }: SpeakRequest, onStart?: () => void) {
      const h = await ensure();
      h.setup({
        voice: config.voiceURI ?? 'af_bella',
        language: 'en-us',
        speed: config.rate,
        audioEncoding: 'wav',
      });
      // Awaiting resolves with all audio messages; long text is split into
      // sentence chunks that we play back in order.
      const messages = await h.synthesize({ input: text });
      let started = false;
      for (const m of messages) {
        if (m.type !== 'audio' || !m.data?.audio) continue;
        await player.play(m.data.audio as AudioBuffer, config.volume, () => {
          if (!started) {
            started = true;
            onStart?.();
          }
        });
      }
    },

    stop() {
      player.stop();
      try {
        engine?.clear();
      } catch {
        /* ignore */
      }
    },
  };
}
