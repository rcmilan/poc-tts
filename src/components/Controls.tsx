import type { SynthConfig, VoiceOption } from '../synth/types';
import styles from './Controls.module.css';

interface Supports {
  voice: boolean;
  langAsVoice: boolean;
  rate: boolean;
  pitch: boolean;
  volume: boolean;
}

interface ControlsProps {
  config: SynthConfig;
  onChange: (patch: Partial<SynthConfig>) => void;
  voices: VoiceOption[];
  voicesLoading: boolean;
  supports: Supports;
  disabled: boolean;
}

/**
 * The shared, normalized control surface. Each section renders the same set of
 * controls but hides whatever its library doesn't support, so the comparison
 * stays honest.
 */
export function Controls({
  config,
  onChange,
  voices,
  voicesLoading,
  supports,
  disabled,
}: ControlsProps) {
  const showVoicePicker = supports.voice || supports.langAsVoice;
  const voiceValue = supports.langAsVoice ? config.lang : (config.voiceURI ?? '');

  const onVoiceChange = (value: string) => {
    if (supports.langAsVoice) {
      onChange({ lang: value });
    } else {
      const picked = voices.find((v) => v.id === value);
      onChange({ voiceURI: value || null, lang: picked?.lang ?? config.lang });
    }
  };

  return (
    <div className={styles.controls}>
      {showVoicePicker && (
        <label className={styles.field}>
          <span className={styles.label}>{supports.langAsVoice ? 'Language' : 'Voice'}</span>
          <select
            className={styles.select}
            value={voiceValue}
            disabled={disabled || voicesLoading}
            onChange={(e) => onVoiceChange(e.target.value)}
          >
            {voicesLoading && <option value="">Loading voices…</option>}
            {!voicesLoading && voices.length === 0 && <option value="">No voices available</option>}
            {!voicesLoading && !supports.langAsVoice && <option value="">System default</option>}
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {supports.rate && (
        <Slider
          label="Rate"
          value={config.rate}
          min={0.5}
          max={2}
          step={0.1}
          disabled={disabled}
          onChange={(rate) => onChange({ rate })}
        />
      )}

      {supports.pitch && (
        <Slider
          label="Pitch"
          value={config.pitch}
          min={0}
          max={2}
          step={0.1}
          disabled={disabled}
          onChange={(pitch) => onChange({ pitch })}
        />
      )}

      {supports.volume && (
        <Slider
          label="Volume"
          value={config.volume}
          min={0}
          max={1}
          step={0.05}
          disabled={disabled}
          onChange={(volume) => onChange({ volume })}
        />
      )}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, disabled, onChange }: SliderProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label} <span className={styles.value}>{value.toFixed(2)}</span>
      </span>
      <input
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
