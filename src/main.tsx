import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App-new.tsx'
import './index-new.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

// Service worker registration is handled inside useServiceWorker hook