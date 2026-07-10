import { getBrowserVoices, toVoiceOptions } from '../browserVoices';
import { loadScript } from '../loadScript';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const talkifyMeta: SynthMeta = {
  id: 'talkify',
  name: 'Talkify',
  description:
    'Talkify by Hagsten, running in its browser (Html5) mode on top of Web Speech — no API key. ' +
    'Premium cloud neural voices exist but require a key and are out of scope here.',
  repoUrl: 'https://github.com/Hagsten/Talkify',
};

// cdn.talkify.net is dead; jsDelivr mirrors the official npm build (talkify-tts).
const TALKIFY_CDN = 'https://cdn.jsdelivr.net/npm/talkify-tts@4/dist/talkify.min.js';

/**
 * The real Talkify (Hagsten) is not the `talkify` npm package — that name is a
 * chatbot framework. Talkify is distributed via CDN, so we load it as a global.
 * We use Html5Player (browser voices) and detect end-of-speech by polling
 * speechSynthesis, which Html5Player drives under the hood.
 */
export function createTalkifyAdapter(): SynthAdapter {
  let player: any = null;
  let endTimer: number | null = null;

  function getGlobalTalkify(): any {
    return (window as unknown as { talkify?: any }).talkify;
  }

  async function ensure() {
    if (player) return;
    await loadScript(TALKIFY_CDN);
    const talkify = getGlobalTalkify();
    if (!talkify || !talkify.Html5Player) {
      throw new Error('Talkify failed to load from CDN');
    }
    player = new talkify.Html5Player();
  }

  function clearTimer() {
    if (endTimer !== null) {
      window.clearInterval(endTimer);
      endTimer = null;
    }
  }

  return {
    supports: {
      voice: true,
      langAsVoice: false,
      rate: true,
      pitch: false,
      volume: false,
      tone: false,
    },

    async load() {
      await ensure();
    },

    async getVoices(): Promise<VoiceOption[]> {
      // Html5Player speaks through Web Speech, so its voices are the browser's.
      const voices = await getBrowserVoices();
      return toVoiceOptions(voices);
    },

    async speak({ text, config }: SpeakRequest, onStart?: () => void) {
      await ensure();

      try {
        if (typeof player.setRate === 'function') player.setRate(config.rate);
        if (config.voiceURI && typeof player.forceVoice === 'function') {
          // forceVoice assigns this object straight to utterance.voice, so it
          // must be a real SpeechSynthesisVoice — a plain {name} produces
          // voice-unavailable and silence.
          const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === config.voiceURI);
          if (voice) player.forceVoice(voice);
        }
      } catch {
        /* best-effort configuration; fall back to defaults */
      }

      await new Promise<void>((resolve, reject) => {
        try {
          player.playText(text);
          onStart?.();
          // Resolve once the browser's synthesizer reports it is no longer
          // speaking (with a small grace period for it to spin up).
          let started = false;
          clearTimer();
          endTimer = window.setInterval(() => {
            const speaking =
              typeof speechSynthesis !== 'undefined' &&
              (speechSynthesis.speaking || speechSynthesis.pending);
            if (speaking) started = true;
            if (started && !speaking) {
              clearTimer();
              resolve();
            }
          }, 200);
          // Hard cap so we never hang forever.
          window.setTimeout(() => {
            if (endTimer !== null) {
              clearTimer();
              resolve();
            }
          }, 60000);
        } catch (err) {
          clearTimer();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },

    stop() {
      clearTimer();
      try {
        if (player && typeof player.pause === 'function') player.pause();
      } catch {
        /* ignore */
      }
      // Html5Player drives speechSynthesis; make sure it actually stops.
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    },
  };
}
