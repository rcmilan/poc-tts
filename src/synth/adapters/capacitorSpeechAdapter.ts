import type { PluginListenerHandle } from '@capacitor/core';
import type { SpeechSynthesisPlugin, VoiceInfo } from '@capgo/capacitor-speech-synthesis';
import { getBrowserVoices } from '../browserVoices';
import type { SpeakRequest, SynthAdapter, SynthMeta, VoiceOption } from '../types';

export const capacitorSpeechMeta: SynthMeta = {
  id: 'capacitor-speech-synthesis',
  name: 'Capacitor Speech Synthesis',
  description:
    "Capgo's Capacitor plugin. Native TTS on iOS/Android; on the web it falls back to the Web " +
    'Speech API (same OS voices), driven through an event-based (start/end/error) plugin API. ' +
    'Full rate/pitch/volume.',
  repoUrl: 'https://github.com/Cap-go/capacitor-speech-synthesis',
};

/**
 * @capgo/capacitor-speech-synthesis is a Capacitor plugin registered via
 * @capacitor/core's registerPlugin. On the web it lazily loads its own
 * SpeechSynthesisWeb implementation, which wraps window.speechSynthesis.
 *
 * Unlike the other wrappers, speak() resolves *immediately* with an
 * utteranceId — completion is reported through 'start'/'end'/'error' listener
 * events — so we bridge those events back into the promise-based adapter API.
 */
export function createCapacitorSpeechAdapter(): SynthAdapter {
  let plugin: SpeechSynthesisPlugin | null = null;

  async function ensure() {
    if (plugin) return;
    const mod = await import('@capgo/capacitor-speech-synthesis');
    plugin = mod.SpeechSynthesis;
  }

  return {
    supports: {
      voice: true,
      langAsVoice: false,
      rate: true,
      pitch: true,
      volume: true,
      tone: false,
    },

    async load() {
      await ensure();
    },

    async getVoices(): Promise<VoiceOption[]> {
      await ensure();
      // The plugin's web backend reads window.speechSynthesis.getVoices(),
      // which is empty until the browser fires voiceschanged — warm it first.
      await getBrowserVoices();
      const { voices } = await plugin!.getVoices();
      return voices.map((v: VoiceInfo) => ({
        id: v.id,
        label: `${v.name} (${v.language})${v.default ? ' — default' : ''}`,
        lang: v.language,
      }));
    },

    async speak({ text, config }: SpeakRequest, onStart?: () => void) {
      await ensure();
      if (!plugin) throw new Error('Capacitor Speech Synthesis failed to load');

      const handles: PluginListenerHandle[] = [];
      const removeAll = () => {
        for (const h of handles) h.remove();
      };

      await new Promise<void>((resolve, reject) => {
        let selfId: string | null = null;
        // Events fire for every utterance; only react to the one we started.
        const isMine = (id: string) => selfId === null || id === selfId;

        Promise.all([
          plugin!.addListener('start', ({ utteranceId }) => {
            if (isMine(utteranceId)) onStart?.();
          }),
          plugin!.addListener('end', ({ utteranceId }) => {
            if (!isMine(utteranceId)) return;
            removeAll();
            resolve();
          }),
          plugin!.addListener('error', ({ utteranceId, error }) => {
            if (!isMine(utteranceId)) return;
            removeAll();
            reject(new Error(error || 'Capacitor Speech Synthesis error'));
          }),
        ])
          .then((registered) => {
            handles.push(...registered);
            return plugin!.speak({
              text,
              language: config.lang,
              voiceId: config.voiceURI ?? undefined,
              rate: config.rate,
              pitch: config.pitch,
              volume: config.volume,
              queueStrategy: 'Flush', // replace anything already queued
            });
          })
          .then(({ utteranceId }) => {
            selfId = utteranceId;
          })
          .catch((err) => {
            removeAll();
            reject(err instanceof Error ? err : new Error(String(err)));
          });
      });
    },

    stop() {
      plugin?.cancel();
    },
  };
}
