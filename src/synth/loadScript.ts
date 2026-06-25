const loaded = new Map<string, Promise<void>>();

/**
 * Inject a <script src> once and resolve when it has loaded. Used for legacy
 * libraries that are only reliably distributed via CDN (e.g. Talkify).
 */
export function loadScript(src: string): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loaded.delete(src); // allow a retry on next call
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(el);
  });

  loaded.set(src, promise);
  return promise;
}
