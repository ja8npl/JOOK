import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './pwa'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

if (new URLSearchParams(window.location.search).has('layoutDebug')) {
  document.documentElement.dataset.layoutDebug = 'true';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
