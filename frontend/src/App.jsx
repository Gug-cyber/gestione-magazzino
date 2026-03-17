import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Prodotti from './pages/Prodotti.jsx'
import DettaglioProdotto from './pages/DettaglioProdotto.jsx'
import Movimenti from './pages/Movimenti.jsx'
import Fornitori from './pages/Fornitori.jsx'
import Ubicazioni from './pages/Ubicazioni.jsx'
import Categorie from './pages/Categorie.jsx'
import Profilo from './pages/Profilo.jsx'
import Analisi from './pages/Analisi.jsx'
import NuovoProdotto from './pages/NuovoProdotto.jsx'
import NuovoMovimento from './pages/NuovoMovimento.jsx'
import Fatture from './pages/Fatture.jsx'
import Clienti from './pages/Clienti.jsx'
import DettaglioCliente from './pages/DettaglioCliente.jsx'
import DettaglioOrdine from './pages/DettaglioOrdine.jsx'
import Ordini from './pages/Ordini.jsx'
import CardTrader from './pages/CardTrader.jsx'
import Amministrazione from './pages/Amministrazione.jsx'
import Forniture from './pages/Forniture.jsx'
import DettaglioFornitura from './pages/DettaglioFornitura.jsx'
import NuovoOrdine from './pages/NuovoOrdine.jsx'
import ScannerBarcode from './pages/ScannerBarcode.jsx'
function AppLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main style={{
          flex: 1,
          padding: 'clamp(12px, 3vw, 24px)',
          paddingBottom: 'max(clamp(12px, 3vw, 24px), env(safe-area-inset-bottom, 0px))',
          backgroundColor: '#f5f5f5',
          minWidth: 0,
          overflowX: 'hidden',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/prodotti" element={
            <ProtectedRoute>
              <AppLayout><Prodotti /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/prodotti/nuovo" element={
            <ProtectedRoute>
              <AppLayout><NuovoProdotto /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/prodotti/:id" element={
            <ProtectedRoute>
              <AppLayout><DettaglioProdotto /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/movimenti/nuovo" element={
            <ProtectedRoute>
              <AppLayout><NuovoMovimento /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/movimenti" element={
            <ProtectedRoute>
              <AppLayout><Movimenti /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/fornitori" element={
            <ProtectedRoute>
              <AppLayout><Fornitori /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ubicazioni" element={
            <ProtectedRoute>
              <AppLayout><Ubicazioni /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/categorie" element={
            <ProtectedRoute>
              <AppLayout><Categorie /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profilo" element={
            <ProtectedRoute>
              <AppLayout><Profilo /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/analisi" element={
            <ProtectedRoute>
              <AppLayout><Analisi /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/fatture" element={
            <ProtectedRoute>
              <AppLayout><Fatture /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/clienti/:id" element={
            <ProtectedRoute>
              <AppLayout><DettaglioCliente /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/clienti" element={
            <ProtectedRoute>
              <AppLayout><Clienti /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ordini/nuovo" element={
            <ProtectedRoute>
              <AppLayout><NuovoOrdine /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ordini/:id" element={
            <ProtectedRoute>
              <AppLayout><DettaglioOrdine /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ordini" element={
            <ProtectedRoute>
              <AppLayout><Ordini /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/cardtrader" element={
            <ProtectedRoute>
              <AppLayout><CardTrader /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/amministrazione" element={
            <ProtectedRoute>
              <AppLayout><Amministrazione /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/forniture/:id" element={
            <ProtectedRoute>
              <AppLayout><DettaglioFornitura /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/forniture" element={
            <ProtectedRoute>
              <AppLayout><Forniture /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/barcode/scanner" element={
            <ProtectedRoute>
              <AppLayout><ScannerBarcode /></AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
