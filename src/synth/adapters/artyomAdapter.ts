import { getBrowserVoices, toVoiceOptions } from '../browserVoices';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const artyomMeta: SynthMeta = {
  id: 'artyom',
  name: 'Artyom.js',
  description:
    'Voice-assistant library (also does speech recognition/commands) with Web Speech TTS bolted ' +
    'on. OS voices, no pitch — and it natively forces one voice per language, so this adapter ' +
    'overrides that to respect the voice you pick.',
  repoUrl: 'https://github.com/sdkcarlos/artyom.js',
};

/**
 * artyom.js ships an untyped default-export constructor. Its internal
 * getVoice(lang) maps a language code to a *fixed* voice from its own table,
 * ignoring any specific choice — which made our old language picker show one
 * voice while a different one spoke. We present the real browser voices and
 * override getVoice so talk() uses exactly the selected SpeechSynthesisVoice
 * (falling back to artyom's native pick only for "System default").
 */
export function createArtyomAdapter(): SynthAdapter {
  let artyom: any = null;
  let active = false;
  let origGetVoice: ((lang: string) => SpeechSynthesisVoice | undefined) | null = null;

  async function ensure() {
    if (artyom) return;
    // CJS build exposes the class at .default; Vite interop may nest it one level deeper.
    const mod = (await import('artyom.js/build/artyom.js')) as any;
    const Artyom = mod.default?.default ?? mod.default ?? mod;
    artyom = new Artyom();
    origGetVoice = artyom.getVoice.bind(artyom);
  }

  return {
    supports: {
      voice: true,
      langAsVoice: false,
      rate: true,
      pitch: false,
      volume: true,
      tone: false,
    },

    async load() {
      await ensure();
    },

    async getVoices(): Promise<VoiceOption[]> {
      await ensure();
      const voices = await getBrowserVoices();
      return toVoiceOptions(voices);
    },

    async speak({ text, config }: SpeakRequest, onStart?: () => void) {
      await ensure();

      const voice = config.voiceURI
        ? speechSynthesis.getVoices().find((v) => v.voiceURI === config.voiceURI)
        : undefined;
      // Force artyom.talk() to use the chosen voice instead of its per-language default.
      artyom.getVoice = (lang: string) => voice ?? origGetVoice?.(lang);

      // artyom reads voice/speed/volume from its global properties, so configure
      // it right before speaking. listen:false keeps speech recognition off.
      await artyom
        .initialize({
          lang: voice?.lang || config.lang || 'en-US',
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
