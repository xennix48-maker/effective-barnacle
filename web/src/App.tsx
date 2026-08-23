import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AppRoutes } from './routes';
import { ConfigGate } from './ConfigGate';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="page page--centered">
          <div className="drop-closed-card">
            <div className="drop-closed-card__icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'left' }}>
              {this.state.error.message}
            </p>
            <button className="cta-btn" onClick={() => location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ConfigGate>
        <AppRoutes />
      </ConfigGate>
    </ErrorBoundary>
  );
}
