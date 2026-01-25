
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- Console Suppression for Dev Noise ---
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const msg = args.map(a => String(a)).join(' ');
  if (msg.includes('cdn.tailwindcss.com')) return;
  originalWarn(...args);
};

console.error = (...args) => {
  const msg = args.map(a => {
    if (typeof a === 'object') return JSON.stringify(a);
    return String(a);
  }).join(' ');

  if (msg.includes('width') && msg.includes('height') && msg.includes('chart')) return;
  if ((msg.includes('width') || msg.includes('height')) && (msg.includes('greater than 0') || msg.includes('-1'))) return;

  originalError(...args);
};
// -----------------------------------------

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
