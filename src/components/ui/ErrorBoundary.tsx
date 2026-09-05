import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('profile_selection');
      localStorage.removeItem('cached_timetable_classes');
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Safiro, system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Something went wrong</h1>
          <p style={{ color: '#888', maxWidth: '450px', marginBottom: '25px', fontSize: '0.95rem' }}>
            We encountered an unexpected error while rendering the timetable.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1px solid #444',
                padding: '10px 20px',
                borderRadius: '20px',
                cursor: 'pointer',
              }}
            >
              Reset Data
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
