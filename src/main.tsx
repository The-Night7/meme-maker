import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PresenterView from './PresenterView'
import AdminView from './AdminView'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/presenter/:roomCode" element={<PresenterView />} />
        <Route path="/admin/:roomCode" element={<AdminView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)