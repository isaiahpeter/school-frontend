import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import { AppRouter } from './routes/AppRoutes'
import { AuthProvider } from './context/AuthContext'
import { SchoolProvider } from './context/SchoolContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SchoolProvider>
        <Toaster position="top-right" />
        <AppRouter />
      </SchoolProvider>
    </AuthProvider>
  </StrictMode>,
)