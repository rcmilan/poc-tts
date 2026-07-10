/**
 * Playback for the neural adapters (Kokoro, HeadTTS). Unlike the Web Speech
 * adapters, these synthesize an audio buffer that we play ourselves. Both a WAV
 * Blob (Kokoro) and an already-decoded AudioBuffer (HeadTTS) are accepted; we
 * route everything through Web Audio so volume works via a GainNode and stop()
 * is instant.
 *
 * ponytail: assumes one playback at a time per instance (SynthSection disables
 * Play while speaking), so play() cancels any prior source without resolving it.
 */
export function createAudioPlayer() {
  let ctx: AudioContext | null = null;
  let current: AudioBufferSourceNode | null = null;

  function audioCtx(): AudioContext {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    return ctx;
  }

  function stop(): void {
    if (current) {
      current.onended = null;
      try {
        current.stop();
      } catch {
        /* already stopped */
      }
      current = null;
    }
  }

  async function play(
    source: Blob | AudioBuffer,
    opts: { volume: number; tone?: number },
    onStart?: () => void,
  ): Promise<void> {
    const { volume, tone = 0 } = opts;
    const c = audioCtx();
    if (c.state === 'suspended') await c.resume();
    const buffer =
      source instanceof AudioBuffer ? source : await c.decodeAudioData(await source.arrayBuffer());
    stop();

    const node = c.createBufferSource();
    node.buffer = buffer;

    // source -> tone (high-shelf tilt) -> volume -> out
    const filter = c.createBiquadFilter();
    filter.type = 'highshelf';
    filter.frequency.value = 2000;
    filter.gain.value = Math.max(-1, Math.min(1, tone)) * 12; // ±12 dB

    const gain = c.createGain();
    gain.gain.value = volume;

    node.connect(filter).connect(gain).connect(c.destination);
    current = node;

    await new Promise<void>((resolve) => {
      node.onended = () => {
        if (current === node) current = null;
        resolve();
      };
      node.start();
      onStart?.();
    });
  }

  return { play, stop };
}
