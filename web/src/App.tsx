import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Helmet from './pages/Helmet.tsx'
import { Simulator } from './pages/Simulator.tsx'

// The app has one page for an audience: the helmet page, at the first address.
// No page links to the simulator: the presenter types /simulator in the address bar.
// Each other address, also the old /helmet and /trip, goes to the first page.
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Helmet />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
