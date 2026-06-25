import type { VoiceOption } from './types';

/**
 * The browser's speechSynthesis voice list loads asynchronously: on first call
 * getVoices() often returns []. This resolves once voices are actually present
 * (or after a short timeout, in case the platform never fires the event).
 */
export function getBrowserVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve([]);
      return;
    }

    const existing = speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(speechSynthesis.getVoices());
    };

    const onChange = () => finish();
    speechSynthesis.addEventListener('voiceschanged', onChange);
    window.setTimeout(finish, timeoutMs);
  });
}

/** Map browser voices to the normalized VoiceOption used by the dropdowns. */
export function toVoiceOptions(voices: SpeechSynthesisVoice[]): VoiceOption[] {
  return voices.map((v) => ({
    id: v.voiceURI,
    label: `${v.name} (${v.lang})${v.default ? ' — default' : ''}`,
    lang: v.lang,
  }));
}

/** Find a SpeechSynthesisVoice by its voiceURI, if available. */
export function findVoice(voiceURI: string | null): SpeechSynthesisVoice | undefined {
  if (!voiceURI || typeof speechSynthesis === 'undefined') return undefined;
  return speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
}
