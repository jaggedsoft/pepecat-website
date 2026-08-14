import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/oswald/wght.css'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import './fonts.css'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
