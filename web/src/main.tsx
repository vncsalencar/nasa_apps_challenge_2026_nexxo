import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import '@fontsource/sora/latin-400.css'
import '@fontsource/sora/latin-500.css'
import '@fontsource/sora/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import './index.css'
import { Dashboard } from './pages/Dashboard.tsx'
import { Simulator } from './pages/Simulator.tsx'

// The app has two pages. The dashboard is the first page. No page links to the simulator:
// the presenter types /simulator in the address bar.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
