import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './routes/AppRouter.jsx'
import PwaUpdateNotice from './shared/components/PwaUpdateNotice.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRouter />
    <PwaUpdateNotice />
  </StrictMode>,
)
