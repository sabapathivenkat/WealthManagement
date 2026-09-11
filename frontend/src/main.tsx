import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './api/client'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './auth/ThemeContext'
import { GlassProvider } from './auth/GlassContext'
import { ConfirmProvider } from './components/ConfirmProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <GlassProvider>
          <AuthProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </AuthProvider>
        </GlassProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
