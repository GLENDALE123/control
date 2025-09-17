
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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

// Initialize Firebase Cloud Messaging (non-blocking)
initFCM().then(({ token, permission }) => {
  if (permission === 'granted' && token) {
    console.log('FCM token:', token);
  } else {
    console.log('FCM permission:', permission);
  }
}).catch((err) => {
  console.error('FCM init failed', err);
});
