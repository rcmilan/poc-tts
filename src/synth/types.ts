/**
 * Shared, normalized model used by every synth section so the libraries can be
 * compared apples-to-apples. Each library adapter receives a SpeakRequest and
 * maps it onto its own API.
 */

export type SynthStatus = 'idle' | 'loading' | 'speaking' | 'error';

/** The set of normalized controls. Not every library supports every field. */
export interface SynthConfig {
  /** Voice identifier. Meaning depends on the library (see VoiceOption). */
  voiceURI: string | null;
  /** BCP-47 language tag, e.g. "en-US". Primarily used by artyom. */
  lang: string;
  /** Playback rate. Web Speech range is roughly 0.1–10, sane range 0.5–2. */
  rate: number;
  /** Pitch. Web Speech range 0–2. */
  pitch: number;
  /** Volume. 0–1. */
  volume: number;
}

/** A selectable voice presented in a section's dropdown. */
export interface VoiceOption {
  /** Stable id used as the select value. */
  id: string;
  /** Human label shown in the dropdown. */
  label: string;
  /** BCP-47 language tag associated with the voice, when known. */
  lang: string;
}

/** Everything an adapter needs to speak one phrase. */
export interface SpeakRequest {
  text: string;
  config: SynthConfig;
}

/**
 * What each section needs from its library. Sections stay dumb; all the
 * library-specific behaviour lives behind this interface.
 */
export interface SynthAdapter {
  /** Lazily load the library (dynamic import / CDN). Safe to call repeatedly. */
  load(): Promise<void>;
  /** Voices this library can offer, given the current browser environment. */
  getVoices(): Promise<VoiceOption[]>;
  /** Speak the phrase. Resolves when speech finishes (or rejects on error). */
  speak(req: SpeakRequest, onStart?: () => void): Promise<void>;
  /** Stop any in-flight speech immediately. */
  stop(): void;
  /**
   * Which normalized controls this library actually honors. Controls not listed
   * are hidden in the section UI to keep the comparison honest.
   */
  supports: {
    voice: boolean;
    /** When true the "voice" picker is a language picker instead (artyom). */
    langAsVoice: boolean;
    rate: boolean;
    pitch: boolean;
    volume: boolean;
  };
}

/** Static metadata shown in each section header. */
export interface SynthMeta {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  /** Installed npm version, filled in at module load where available. */
  version?: string;
}
