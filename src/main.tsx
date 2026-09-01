import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './services/swService';

// Global resilience listeners to prevent vehicle webview crashes or reload loops
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.warn('[AudioCar Safety Guard] Caught global error:', event.message || event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[AudioCar Safety Guard] Caught unhandled rejection:', event.reason);
    // Prevent default browser crash behavior
    event.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
