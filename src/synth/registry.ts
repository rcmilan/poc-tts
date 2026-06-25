import { createArtyomAdapter, artyomMeta } from './adapters/artyomAdapter';
import { createEasySpeechAdapter, easySpeechMeta } from './adapters/easySpeechAdapter';
import { createSpeakTtsAdapter, speakTtsMeta } from './adapters/speakTtsAdapter';
import { createTalkifyAdapter, talkifyMeta } from './adapters/talkifyAdapter';
import type { SynthAdapter, SynthMeta } from './types';

export interface SynthEntry {
  meta: SynthMeta;
  createAdapter: () => SynthAdapter;
}

/**
 * Versions of the npm-installed libraries. Talkify is loaded from CDN, so its
 * version is whatever the CDN currently serves.
 */
const VERSIONS: Record<string, string> = {
  'easy-speech': '2.4.0',
  'speak-tts': '2.0.8',
  artyom: '1.0.6',
  talkify: 'cdn (latest)',
};

function withVersion(meta: SynthMeta): SynthMeta {
  return { ...meta, version: VERSIONS[meta.id] };
}

/** The sections rendered on the page, in display order. */
export const SYNTHS: SynthEntry[] = [
  { meta: withVersion(easySpeechMeta), createAdapter: createEasySpeechAdapter },
  { meta: withVersion(speakTtsMeta), createAdapter: createSpeakTtsAdapter },
  { meta: withVersion(artyomMeta), createAdapter: createArtyomAdapter },
  { meta: withVersion(talkifyMeta), createAdapter: createTalkifyAdapter },
];
