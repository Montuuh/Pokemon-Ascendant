import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installDevTools } from './dev/devtools';
import { applySettings, useSettingsStore } from './app/settingsStore';
import './ui/styles/global.css';

if (import.meta.env.DEV) installDevTools();

// §9.6 — text size and the motion override are attributes on <html>, applied before the first paint so a
// player who needs 150 % never sees the game at 100 % first.
applySettings(useSettingsStore.getState());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
