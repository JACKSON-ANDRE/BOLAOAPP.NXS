
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- Console Suppression REMOVED for Debugging ---
// (Letting Safari log everything to find the blackout cause)

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);

// Global Rejection Catcher
window.onunhandledrejection = (event) => {
  console.error('Unhandled rejection:', event.reason);
};
