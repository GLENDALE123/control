

import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Changed to a named import to match the export style in App.tsx.
import { App } from './App';
import { initFCM } from './services/fcm';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize FCM when app boots (non-blocking)
initFCM().catch(() => {});