import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_CONFIG } from '../synth/defaults';
import type { SynthEntry } from '../synth/registry';
import type { SynthConfig, SynthStatus, VoiceOption } from '../synth/types';
import { Controls } from './Controls';
import styles from './SynthSection.module.css';

interface SynthSectionProps {
  entry: SynthEntry;
  /** The shared phrase typed once at the top of the page. */
  text: string;
}

const STATUS_LABEL: Record<SynthStatus, string> = {
  idle: 'Idle',
  loading: 'Loading',
  speaking: 'Speaking',
  error: 'Error',
};

export function SynthSection({ entry, text }: SynthSectionProps) {
  const { meta } = entry;
  // One adapter instance per section, kept stable across renders.
  const adapter = useMemo(() => entry.createAdapter(), [entry]);

  const [config, setConfig] = useState<SynthConfig>(DEFAULT_CONFIG);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [status, setStatus] = useState<SynthStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Load the library and its voices once, on mount.
  useEffect(() => {
    let cancelled = false;
    setVoicesLoading(true);
    adapter
      .load()
      .then(() => adapter.getVoices())
      .then((list) => {
        if (cancelled) return;
        setVoices(list);
        // Preselect the first voice so the dropdown isn't empty for libs that
        // expect an explicit selection (artyom's language picker).
        if (list.length > 0) {
          setConfig((c) => {
            if (adapter.supports.langAsVoice) {
              return { ...c, lang: list[0].lang };
            }
            return c;
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      })
      .finally(() => {
        if (!cancelled) setVoicesLoading(false);
      });

    return () => {
      cancelled = true;
      adapter.stop();
    };
  }, [adapter]);

  const patchConfig = (patch: Partial<SynthConfig>) => setConfig((c) => ({ ...c, ...patch }));

  // The exact normalized payload this library will receive (debug panel).
  const resolvedConfig = useMemo(() => ({ text, config }), [text, config]);

  const onPlay = async () => {
    if (!text.trim()) return;
    setError(null);
    setStatus('loading');
    try {
      await adapter.speak({ text, config }, () => setStatus('speaking'));
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  const onStop = () => {
    adapter.stop();
    setStatus('idle');
  };

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{meta.name}</h2>
          {meta.version && <span className={styles.version}>v{meta.version}</span>}
          <span className={`${styles.status} ${styles[status]}`}>{STATUS_LABEL[status]}</span>
        </div>
        <p className={styles.description}>{meta.description}</p>
        <a className={styles.repo} href={meta.repoUrl} target="_blank" rel="noreferrer">
          {meta.repoUrl}
        </a>
      </header>

      <Controls
        config={config}
        onChange={patchConfig}
        voices={voices}
        voicesLoading={voicesLoading}
        supports={adapter.supports}
        disabled={status === 'speaking' || status === 'loading'}
      />

      <div className={styles.actions}>
        <button
          className={styles.play}
          onClick={onPlay}
          disabled={status === 'speaking' || status === 'loading' || !text.trim()}
        >
          ▶ Play
        </button>
        <button className={styles.stop} onClick={onStop} disabled={status === 'idle'}>
          ■ Stop
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.debugToggle} onClick={() => setShowConfig((s) => !s)}>
        {showConfig ? '▾' : '▸'} Current config
      </button>
      {showConfig && <pre className={styles.debug}>{JSON.stringify(resolvedConfig, null, 2)}</pre>}
    </section>
  );
}
