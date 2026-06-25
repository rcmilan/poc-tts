import { useState } from 'react';
import styles from './App.module.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SynthSection } from './components/SynthSection';
import { DEFAULT_TEXT } from './synth/defaults';
import { SYNTHS } from './synth/registry';

export default function App() {
  // The single shared phrase every section speaks, so the comparison is
  // apples-to-apples: same input, hear the difference between libraries.
  const [text, setText] = useState(DEFAULT_TEXT);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Voice Synth Libraries Comparison</h1>
        <p className={styles.heroSubtitle}>
          The same phrase, spoken by four different JavaScript speech-synthesis libraries. Tweak
          each section's voice and parameters, then hit Play to compare.
        </p>

        <label className={styles.textField}>
          <span className={styles.textLabel}>Phrase to speak (shared by all sections)</span>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Type something to synthesize…"
          />
        </label>
      </header>

      <main className={styles.grid}>
        {SYNTHS.map((entry) => (
          <ErrorBoundary key={entry.meta.id} label={entry.meta.name}>
            <SynthSection entry={entry} text={text} />
          </ErrorBoundary>
        ))}
      </main>

      <footer className={styles.footer}>
        <p>
          All libraries run here in browser / Web Speech mode. Available voices depend on your
          operating system and browser. Talkify's premium neural voices require an API key and are
          out of scope for this POC.
        </p>
      </footer>
    </div>
  );
}
