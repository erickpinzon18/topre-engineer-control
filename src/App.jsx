import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import EngineerDashboard from './pages/EngineerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AssemblyDetail from './pages/AssemblyDetail';
import AssemblyView from './pages/AssemblyView';
import PressDashboard from './pages/PressDashboard';
import PressDetail from './pages/PressDetail';
import PressView from './pages/PressView';
import HotPressDashboard from './pages/HotPressDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* ========== RUTAS DE INGENIEROS POR SECCIÓN ========== */}
          
          {/* --- Sección ASSY (Assembly) --- */}
          <Route 
            path="/engineer/assy" 
            element={
              <ProtectedRoute requireEngineer={true} allowedSections={['assy']}>
                <EngineerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/engineer/assy/assembly/:id" 
            element={
              <ProtectedRoute requireEngineer={true} allowedSections={['assy']}>
                <AssemblyDetail />
              </ProtectedRoute>
            } 
          />

          {/* --- Sección PRESS --- */}
          <Route 
            path="/engineer/press" 
            element={
              <ProtectedRoute requireEngineer={true} allowedSections={['press']}>
                <PressDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/engineer/press/:id" 
            element={
              <ProtectedRoute requireEngineer={true} allowedSections={['press']}>
                <PressDetail />
              </ProtectedRoute>
            } 
          />

          {/* --- Sección HOT-PRESS --- */}
          <Route 
            path="/engineer/hot-press" 
            element={
              <ProtectedRoute requireEngineer={true} allowedSections={['hot-press']}>
                <HotPressDashboard />
              </ProtectedRoute>
            } 
          />
          {/* Aquí irán las rutas de detalle de Hot-Press cuando se desarrollen */}

          {/* Ruta legacy /engineer redirige según sección (se maneja en Login) */}
          <Route path="/engineer" element={<Navigate to="/login" replace />} />

          {/* ========== RUTAS DE ADMINISTRADOR ========== */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/assembly/:id" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AssemblyView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/press/:id" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <PressView />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
