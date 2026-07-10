import type { SynthConfig } from './types';

export const DEFAULT_CONFIG: SynthConfig = {
  voiceURI: null,
  lang: 'en-US',
  rate: 1,
  pitch: 1,
  volume: 1,
  pan: 0,
  tone: 0,
};

export const DEFAULT_TEXT = 'Hello! This is a comparison of browser voice synthesis libraries.';
