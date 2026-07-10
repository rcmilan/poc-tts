import { getBrowserVoices } from '../browserVoices';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const artyomMeta: SynthMeta = {
  id: 'artyom',
  name: 'Artyom.js',
  description:
    'Older voice assistant wrapper. Selects voices by language and honors speed/volume (no pitch).',
  repoUrl: 'https://github.com/sdkcarlos/artyom.js',
};

/**
 * artyom.js ships an untyped default-export constructor. It picks a voice by
 * language rather than a specific voiceURI, so this section presents a language
 * picker (supports.langAsVoice). Rate maps to `speed`; pitch is unsupported.
 */
export function createArtyomAdapter(): SynthAdapter {
  let artyom: any = null;
  let active = false;

  async function ensure() {
    if (artyom) return;
    // CJS build exposes the class at .default; Vite interop may nest it one level deeper.
    const mod = (await import('artyom.js/build/artyom.js')) as any;
    const Artyom = mod.default?.default ?? mod.default ?? mod;
    artyom = new Artyom();
  }

  return {
    supports: {
      voice: false,
      langAsVoice: true,
      rate: true,
      pitch: false,
      volume: true,
      pan: false,
      tone: false,
    },

    async load() {
      await ensure();
    },

    async getVoices(): Promise<VoiceOption[]> {
      await ensure();
      // Offer the distinct languages available from the browser voice list.
      const voices = await getBrowserVoices();
      const seen = new Map<string, string>();
      for (const v of voices) {
        if (!seen.has(v.lang)) seen.set(v.lang, v.name);
      }
      return [...seen.entries()].map(([lang, sample]) => ({
        id: lang,
        label: `${lang} (e.g. ${sample})`,
        lang,
      }));
    },

    async speak({ text, config }: SpeakRequest, onStart?: () => void) {
      await ensure();
      // artyom reads voice/speed/volume from its global properties, so configure
      // it right before speaking. listen:false keeps speech recognition off.
      await artyom
        .initialize({
          lang: config.lang || 'en-US',
          continuous: false,
          listen: false,
          debug: false,
          speed: config.rate,
          volume: config.volume,
        })
        .catch(() => undefined);

      active = true;
      await new Promise<void>((resolve, reject) => {
        try {
          artyom.say(text, {
            onStart: () => onStart?.(),
            onEnd: () => {
              active = false;
              resolve();
            },
          });
        } catch (err) {
          active = false;
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },

    stop() {
      if (artyom && active) {
        try {
          artyom.shutUp();
        } catch {
          /* nothing speaking */
        }
        active = false;
      }
    },
  };
}
