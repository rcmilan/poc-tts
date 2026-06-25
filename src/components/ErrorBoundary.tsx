import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** Shown in the fallback so the user knows which section broke. */
  label: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Wraps each synth section so a crash in one legacy library can't take down the
 * whole comparison page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label}] section crashed:`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: '1rem', color: 'var(--danger)' }}>
          <strong>{this.props.label} failed to render.</strong>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
