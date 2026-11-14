// The entry file of the test page voice-test.html. The app does not use it.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { VoiceTest } from './VoiceTest.tsx'

createRoot(document.getElementById('root')!).render(
  // The app uses StrictMode too. It mounts each component two times in development.
  <StrictMode>
    <VoiceTest />
  </StrictMode>,
)
