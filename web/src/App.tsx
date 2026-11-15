import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard.tsx'
import { Simulator } from './pages/Simulator.tsx'

// The trip page loads when a person opens it, because it brings the trajectory data and more charts.
const Trip = lazy(() => import('./pages/Trip.tsx'))

// The app has three pages. The CO2 page is the first page, and the trip page is at /trip.
// No page links to the simulator: the presenter types /simulator in the address bar.
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/trip"
          element={
            <Suspense fallback={<div className="xp xp-wait" />}>
              <Trip />
            </Suspense>
          }
        />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
