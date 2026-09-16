import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nicht abgefangener UI-Fehler:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}
      >
        <section style={{ maxWidth: '360px' }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: '32px',
            marginBottom: '10px',
          }}>
            Etwas ist schiefgelaufen
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Die Ansicht konnte nicht geladen werden. Bitte lade die App neu.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '14px 22px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-input)',
              color: 'var(--text-on-accent)',
              font: 'inherit',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            App neu laden
          </button>
        </section>
      </main>
    );
  }
}
