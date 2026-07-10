/**
 * Minimal string-keyed LRU. Used by the neural adapters to memoize synthesized
 * audio so an identical (voice + rate + text) replay skips inference entirely.
 * ponytail: fixed cap, evicts oldest; plenty for a demo — swap for a real cache
 * only if a session ever holds more than a few dozen distinct phrases.
 */
export function createLru<V>(max = 24) {
  const m = new Map<string, V>();
  return {
    get(key: string): V | undefined {
      const v = m.get(key);
      if (v !== undefined) {
        m.delete(key);
        m.set(key, v); // mark most-recently-used
      }
      return v;
    },
    set(key: string, value: V): void {
      if (m.has(key)) m.delete(key);
      m.set(key, value);
      if (m.size > max) m.delete(m.keys().next().value as string);
    },
  };
}
