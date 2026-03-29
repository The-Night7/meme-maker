import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PresenterView from './PresenterView'
import AdminView from './AdminView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/presenter/:roomCode" element={<PresenterView />} />
        <Route path="/admin/:roomCode" element={<AdminView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
