import { getBrowserVoices, toVoiceOptions } from '../browserVoices';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const easySpeechMeta: SynthMeta = {
  id: 'easy-speech',
  name: 'EasySpeech',
  description: 'Cross-browser wrapper around the native Web Speech API with a tiny, typed API.',
  repoUrl: 'https://github.com/leaonline/easy-speech',
};

/**
 * easy-speech ships proper ESM + types. It must be init()'d once before use,
 * which also resolves the browser voice list.
 */
export function createEasySpeechAdapter(): SynthAdapter {
  let mod: typeof import('easy-speech').default | null = null;
  let initialized = false;

  async function ensure() {
    if (!mod) {
      mod = (await import('easy-speech')).default;
    }
    if (!initialized) {
      // maxTimeout/interval keep init from hanging on platforms that never fire
      // the voiceschanged event.
      await mod.init({ maxTimeout: 5000, interval: 250 }).catch(() => undefined);
      initialized = true;
    }
  }

  return {
    supports: {
      voice: true,
      langAsVoice: false,
      rate: true,
      pitch: true,
      volume: true,
      pan: false,
      tone: false,
    },

    async load() {
      await ensure();
    },

    async getVoices(): Promise<VoiceOption[]> {
      await ensure();
      const voices = mod?.voices() ?? (await getBrowserVoices());
      return toVoiceOptions(voices as SpeechSynthesisVoice[]);
    },

    async speak({ text, config }: SpeakRequest, onStart?: () => void) {
      await ensure();
      if (!mod) throw new Error('EasySpeech failed to load');
      const voice = mod.voices().find((v) => v.voiceURI === config.voiceURI);
      await mod.speak({
        text,
        voice: voice ?? undefined,
        rate: config.rate,
        pitch: config.pitch,
        volume: config.volume,
        boundary: undefined,
        start: () => onStart?.(),
      });
    },

    stop() {
      mod?.cancel();
    },
  };
}
