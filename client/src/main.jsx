import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Polyfills for Node.js modules in browser
import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.global = window.global || window;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
