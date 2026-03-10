import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Prodotti from './pages/Prodotti.jsx'
import Movimenti from './pages/Movimenti.jsx'
import Fornitori from './pages/Fornitori.jsx'
import Ubicazioni from './pages/Ubicazioni.jsx'

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '24px', backgroundColor: '#f5f5f5' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/prodotti" element={<Prodotti />} />
              <Route path="/movimenti" element={<Movimenti />} />
              <Route path="/fornitori" element={<Fornitori />} />
              <Route path="/ubicazioni" element={<Ubicazioni />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
