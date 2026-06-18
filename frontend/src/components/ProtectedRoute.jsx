import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#1a237e',
      }}>
        <span>⏳ Caricamento...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Salva la pagina di destinazione per il redirect post-login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (user?.must_change_password && location.pathname !== '/profilo') {
    return <Navigate to="/profilo" replace />
  }

  return children
}

export default ProtectedRoute
