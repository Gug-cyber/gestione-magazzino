import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Prodotti from './pages/Prodotti.jsx'
import Movimenti from './pages/Movimenti.jsx'
import Fornitori from './pages/Fornitori.jsx'
import Ubicazioni from './pages/Ubicazioni.jsx'
import Categorie from './pages/Categorie.jsx'
import Profilo from './pages/Profilo.jsx'
import Analisi from './pages/Analisi.jsx'
import NuovoProdotto from './pages/NuovoProdotto.jsx'
import NuovoMovimento from './pages/NuovoMovimento.jsx'
import Fatture from './pages/Fatture.jsx'

function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '24px', backgroundColor: '#f5f5f5' }}>
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
