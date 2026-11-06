import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// Self-hosted Heebo (bundled by Vite) instead of Google Fonts, so visitors'
// browsers never contact Google. See the privacy policy in src/text/legal.he.ts.
import '@fontsource/heebo/400.css'
import '@fontsource/heebo/500.css'
import '@fontsource/heebo/700.css'
import '@fontsource/heebo/900.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)