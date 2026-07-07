import { getBrowserVoices, toVoiceOptions } from '../browserVoices';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const speakTtsMeta: SynthMeta = {
  id: 'speak-tts',
  name: 'Speak-TTS',
  description: 'Promise-based Web Speech API wrapper with simple setVoice / setRate helpers.',
  repoUrl: 'https://github.com/tom-s/speak-tts',
};

/**
 * speak-tts wraps the Web Speech API. It selects voices by *name* rather than
 * voiceURI, so we keep a map from the voiceURI we expose in the UI back to the
 * library's expected name.
 */
export function createSpeakTtsAdapter(): SynthAdapter {
  // The library default export is a constructor; types are loose.
  let speech: any = null;
  let supported = true;
  const uriToName = new Map<string, string>();

  async function ensure() {
    if (speech) return;
    // CJS build exposes the class at .default; Vite interop may nest it one level deeper.
    const mod = (await import('speak-tts')) as any;
    const Speech = mod.default?.default ?? mod.default ?? mod;
    speech = new Speech();
    if (!speech.hasBrowserSupport()) {
      supported = false;
      return;
    }
    await speech.init({ volume: 1, lang: 'en-US', rate: 1, pitch: 1, splitSentences: false });
  }

  return {
    supports: { voice: true, langAsVoice: false, rate: true, pitch: true, volume: true },

    async load() {
      await ensure();
    },

    async getVoices(): Promise<VoiceOption[]> {
      await ensure();
      const voices = await getBrowserVoices();
      uriToName.clear();
      for (const v of voices) uriToName.set(v.voiceURI, v.name);
      return toVoiceOptions(voices);
    },

    async speak({ text, config }: SpeakRequest, onStart?: () => void) {
      await ensure();
      if (!supported) throw new Error('speak-tts: browser has no Web Speech support');

      speech.setLanguage(config.lang);
      speech.setRate(config.rate);
      speech.setPitch(config.pitch);
      speech.setVolume(config.volume);
      const name = config.voiceURI ? uriToName.get(config.voiceURI) : undefined;
      if (name) {
        try {
          speech.setVoice(name);
        } catch {
          /* voice not found on this platform — fall back to default */
        }
      }

      // speak() only resolves/rejects inside the onend/onerror listeners it
      // wraps — omit them and the promise hangs forever.
      await speech.speak({
        text,
        queue: false, // replace anything already queued
        listeners: {
          onstart: () => onStart?.(),
          onend: () => {},
          onerror: () => {},
        },
      });
    },

    stop() {
      try {
        speech?.cancel();
      } catch {
        /* nothing to cancel */
      }
    },
  };
}
