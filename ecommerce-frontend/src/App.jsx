import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import StaticPage from './pages/StaticPage.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Account } from './pages/Account.jsx';
import { Orders } from './pages/Orders.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import OrderDetail from './pages/OrderDetail.jsx';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/catalogo" element={<Catalog />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/pagina/:slug" element={<StaticPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registrati" element={<Register />} />
                <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                <Route path="/ordini" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/ordine-confermato/:orderId" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
                <Route path="/ordine/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              </Routes>
            </main>
            <Footer />
            <ToastContainer />
          </BrowserRouter>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
