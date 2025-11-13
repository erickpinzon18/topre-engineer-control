import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import EngineerDashboard from './pages/EngineerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AssemblyDetail from './pages/AssemblyDetail';
import AssemblyView from './pages/AssemblyView';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rutas de Ingeniero */}
          <Route 
            path="/engineer" 
            element={
              <ProtectedRoute requireEngineer={true}>
                <EngineerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/engineer/assembly/:id" 
            element={
              <ProtectedRoute requireEngineer={true}>
                <AssemblyDetail />
              </ProtectedRoute>
            } 
          />

          {/* Rutas de Administrador */}
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
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
