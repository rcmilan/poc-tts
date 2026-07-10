import type { KokoroTTS } from 'kokoro-js';
import { createAudioPlayer } from '../audioPlayer';
import { KOKORO_VOICES } from '../kokoroVoices';
import { createLru } from '../lru';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const kokoroMeta: SynthMeta = {
  id: 'kokoro',
  name: 'Kokoro.js',
  description:
    'Neural TTS (Kokoro-82M) running fully in-browser via transformers.js + ONNX (WASM). ' +
    'First Play downloads the ~90 MB model from Hugging Face (cached afterward).',
  repoUrl: 'https://github.com/hexgrad/kokoro',
};

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

export function createKokoroAdapter(): SynthAdapter {
  const player = createAudioPlayer();
  const cache = createLru<Blob>();
  let ttsPromise: Promise<KokoroTTS> | null = null;

  // The 90 MB download happens here, on first speak — not on mount.
  function ensureModel(): Promise<KokoroTTS> {
    if (!ttsPromise) {
      ttsPromise = import('kokoro-js').then(({ KokoroTTS }) =>
        KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'wasm' }),
      );
    }
    return ttsPromise;
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
      const voice = config.voiceURI ?? 'af_heart';
      // Volume is applied at playback, so it stays out of the key.
      const key = `${voice}|${config.rate}|${text}`;
      let blob = cache.get(key);
      if (!blob) {
        const tts = await ensureModel();
        const options = { voice, speed: config.rate } as Parameters<KokoroTTS['generate']>[1];
        const audio = await tts.generate(text, options);
        blob = audio.toBlob();
        cache.set(key, blob);
      }
      await player.play(blob, config.volume, onStart);
    },

    stop() {
      player.stop();
    },
  };
}
