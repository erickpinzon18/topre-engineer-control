import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import EngineerDashboard from './EngineerDashboard';

const Dashboard = () => {
  const { currentUser, userProfile, logout, isAdmin, isEngineer } = useAuth();
  const navigate = useNavigate();

  // Si es ingeniero, mostrar su dashboard específico
  if (isEngineer) {
    return <EngineerDashboard />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-sky-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Topre</h1>
              <p className="text-sky-200 text-sm">Control de Mantenimiento</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{userProfile?.name || currentUser?.email}</p>
                <p className="text-sky-200 text-sm">
                  {isAdmin ? 'Administrador' : isEngineer ? 'Ingeniero' : 'Usuario'}
                </p>
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-sky-700 hover:bg-sky-600 px-4 py-2 rounded-md transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="container mx-auto px-4 py-8">
        
        {/* Dashboard para Administrador */}
        {isAdmin && (
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Panel de Administrador</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Tarjetas de estadísticas */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Total Ingenieros</h3>
                <p className="text-3xl font-bold text-sky-900">12</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Máquinas en Proceso</h3>
                <p className="text-3xl font-bold text-sky-900">8</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Completadas Hoy</h3>
                <p className="text-3xl font-bold text-green-600">5</p>
              </div>
            </div>

            {/* Tabla de Ingenieros */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Ingenieros y sus Tareas</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingeniero</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Máquinas Asignadas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progreso</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Juan Pérez
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        3 máquinas
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-sky-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                        <span className="text-xs text-gray-600">65%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          En Proceso
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard para Ingeniero */}
        {isEngineer && (
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Mis Máquinas en Mantenimiento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Tarjetas de estadísticas */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Máquinas Asignadas</h3>
                <p className="text-3xl font-bold text-sky-900">3</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Completadas</h3>
                <p className="text-3xl font-bold text-green-600">1</p>
              </div>
            </div>

            {/* Botón para registrar nueva máquina */}
            <div className="mb-6">
              <button className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg shadow transition">
                + Registrar Nueva Máquina
              </button>
            </div>

            {/* Lista de Máquinas */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Máquina CNC-001</h3>
                    <p className="text-gray-600 text-sm">Tipo: Torno CNC</p>
                  </div>
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    En Proceso
                  </span>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progreso del Checklist</span>
                    <span className="font-medium text-gray-900">5/12 pasos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-sky-600 h-3 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>
                
                <button className="text-sky-600 hover:text-sky-700 font-medium text-sm">
                  Ver Detalles →
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Dashboard;
