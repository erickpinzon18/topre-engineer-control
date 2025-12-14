import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requireEngineer = false,
  allowedSections = [] // Array de secciones permitidas: ['assy', 'press', 'hot-press']
}) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si requiere rol de administrador
  if (requireAdmin && userProfile?.type !== 'admin') {
    // Redirigir al ingeniero a su sección correspondiente
    const section = userProfile?.section || 'assy';
    return <Navigate to={`/engineer/${section}`} replace />;
  }

  // Verificar si requiere rol de ingeniero
  if (requireEngineer && userProfile?.type !== 'ing') {
    return <Navigate to="/admin" replace />;
  }

  // Verificar si el ingeniero tiene acceso a la sección requerida
  if (requireEngineer && allowedSections.length > 0) {
    const userSection = userProfile?.section;
    if (!allowedSections.includes(userSection)) {
      // Redirigir a la sección del usuario
      return <Navigate to={`/engineer/${userSection}`} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
