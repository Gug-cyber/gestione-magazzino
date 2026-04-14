import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { FeatureFlagsProvider } from './context/FeatureFlagsContext'
import { LanguageProvider } from './context/LanguageContext'
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
import Statistiche from './pages/Statistiche.jsx'
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
import NuovaFornitura from './pages/NuovaFornitura.jsx'
import NuovoOrdine from './pages/NuovoOrdine.jsx'
import ScannerBarcode from './pages/ScannerBarcode.jsx'
import ActivityLog from './pages/ActivityLog.jsx'
import AppHome from './pages/AppHome.jsx'
import CaricoFornitura from './pages/CaricoFornitura.jsx'
import MobileAppLayout from './components/MobileAppLayout.jsx'
import MobileHome from './pages/mobile/MobileHome.jsx'
import MobileCaricoFornitura from './pages/mobile/MobileCaricoFornitura.jsx'
import MobileNuovoOrdine from './pages/mobile/MobileNuovoOrdine.jsx'
import TrackingDetail from './pages/TrackingDetail.jsx'
import EbayIntegrazione from './pages/EbayIntegrazione.jsx'
import EbayPubblicaProdotto from './pages/EbayPubblicaProdotto.jsx'
import EbayCallback from './pages/EbayCallback.jsx'
import StorePage from './pages/store/StorePage'
import StoreProductPage from './pages/store/StoreProductPage'
import StoreCartPage from './pages/store/StoreCartPage'
import StoreCheckoutPage from './pages/store/StoreCheckoutPage'
import StoreFooterPage from './pages/store/StoreFooterPage'
import ControlPanel from './pages/ControlPanel'
import { storeAPI } from './api/store'
function AppLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'var(--font-family)' }}>
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main style={{
          flex: 1,
          padding: 'clamp(12px, 3vw, 24px)',
          paddingBottom: 'max(clamp(12px, 3vw, 24px), env(safe-area-inset-bottom, 0px))',
          backgroundColor: 'var(--color-bg)',
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
  useEffect(() => {
    storeAPI.getStoreSettings()
      .then(res => {
        const { store_nome, store_logo_url } = res.data
        if (store_nome) {
          document.title = store_nome
        }
        if (store_logo_url) {
          let link = document.querySelector("link[rel~='icon']")
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.head.appendChild(link)
          }
          link.href = store_logo_url
        }
      })
      .catch(() => {})
  }, [])

  return (
    <LanguageProvider>
    <CartProvider>
      <AuthProvider>
        <FeatureFlagsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/product/:id" element={<StoreProductPage />} />
            <Route path="/store/cart" element={<StoreCartPage />} />
            <Route path="/store/checkout" element={<StoreCheckoutPage />} />
            <Route path="/store/pagina/:slug" element={<StoreFooterPage />} />
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
          <Route path="/statistiche" element={
            <ProtectedRoute>
              <AppLayout><Statistiche /></AppLayout>
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
          <Route path="/activity-log" element={
            <ProtectedRoute>
              <AppLayout><ActivityLog /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/forniture/nuova" element={
            <ProtectedRoute>
              <AppLayout><NuovaFornitura /></AppLayout>
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
          <Route path="/scanner" element={
            <ProtectedRoute>
              <AppLayout><ScannerBarcode /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/app" element={
            <ProtectedRoute>
              <MobileAppLayout><AppHome /></MobileAppLayout>
            </ProtectedRoute>
          } />
          <Route path="/app/carico-fornitura" element={
            <ProtectedRoute>
              <MobileAppLayout><CaricoFornitura /></MobileAppLayout>
            </ProtectedRoute>
          } />
          <Route path="/app/nuovo-ordine" element={
            <ProtectedRoute>
              <MobileAppLayout><NuovoOrdine /></MobileAppLayout>
            </ProtectedRoute>
          } />
          <Route path="/carico-fornitura" element={
            <ProtectedRoute>
              <AppLayout><CaricoFornitura /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/mobile" element={
            <ProtectedRoute>
              <MobileAppLayout><MobileHome /></MobileAppLayout>
            </ProtectedRoute>
          } />
          <Route path="/mobile/carico-fornitura" element={
            <ProtectedRoute>
              <MobileAppLayout><MobileCaricoFornitura /></MobileAppLayout>
            </ProtectedRoute>
          } />
          <Route path="/mobile/nuovo-ordine" element={
            <ProtectedRoute>
              <MobileAppLayout><MobileNuovoOrdine /></MobileAppLayout>
            </ProtectedRoute>
          } />
          <Route path="/tracking/:corriere/:trackingNumber" element={
            <ProtectedRoute>
              <AppLayout><TrackingDetail /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ebay" element={
            <ProtectedRoute>
              <AppLayout><EbayIntegrazione /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ebay/pubblica/:productId" element={
            <ProtectedRoute>
              <AppLayout><EbayPubblicaProdotto /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ebay/callback" element={<EbayCallback />} />
          <Route path="/control-panel" element={
            <ProtectedRoute>
              <AppLayout><ControlPanel /></AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
        </BrowserRouter>
        </FeatureFlagsProvider>
      </AuthProvider>
    </CartProvider>
    </LanguageProvider>
  )
}

export default App
