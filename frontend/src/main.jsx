import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.jsx'
import logoAsset from './assets/ChatGPT Image Sep 12, 2026, 12_33_54 AM.ico'

document.title = 'JALDRISHTI'
const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/x-icon'
favicon.href = logoAsset
document.head.appendChild(favicon)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
