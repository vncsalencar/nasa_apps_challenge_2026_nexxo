import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '@fontsource/sora/latin-400.css'
import '@fontsource/sora/latin-500.css'
import '@fontsource/sora/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/barlow/latin-300.css'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import './index.css'
import { Admin } from './pages/Admin.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Home } from './pages/Home.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/m/:missionId" element={<Dashboard />} />
        <Route path="/m/:missionId/admin" element={<Admin />} />
        <Route path="/m/:missionId/:screen" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
