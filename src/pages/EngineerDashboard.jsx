import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import AssemblyModal from '../components/AssemblyModal';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const EngineerDashboard = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const [assemblies, setAssemblies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAssemblies();
  }, [currentUser]);

  const loadAssemblies = async () => {
    try {
      const q = query(
        collection(db, 'assemblies'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const assembliesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAssemblies(assembliesData);
    } catch (error) {
      console.error('Error cargando ensambles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssembly = async (assemblyData) => {
    try {
      await addDoc(collection(db, 'assemblies'), {
        ...assemblyData,
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.email,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      setIsModalOpen(false);
      loadAssemblies();
    } catch (error) {
      console.error('Error creando ensamble:', error);
      alert('Error al crear el ensamble');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const getTypeColor = (type) => {
    return type === 'QC' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  const getTypeLabel = (type) => {
    return type === 'QC' ? 'QC - Level Up' : 'TEACH';
  };

  const calculateProgress = (assembly) => {
    // TODO: Calcular basado en checklist completado
    return assembly.progress || 0;
  };

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

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Section Header and Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-5">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
            Ensambles Activos
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition duration-300 w-full sm:w-auto"
          >
            {/* Plus Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">Registrar Nuevo Ensamble</span>
            <span className="sm:hidden">Nuevo Ensamble</span>
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {assemblies.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="text-gray-500 text-base sm:text-lg">No tienes ensambles registrados</p>
              <p className="text-gray-400 text-sm mt-2">Haz clic en "Registrar Nuevo Ensamble" para comenzar</p>
            </div>
          ) : (
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {/* Table Header */}
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ensamble
                      </th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responsable
                      </th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Porcentaje de Calidad
                      </th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fechas
                      </th>
                    </tr>
                  </thead>
                  
                  {/* Table Body */}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assemblies.map((assembly) => {
                      const progress = calculateProgress(assembly);
                      return (
                        <tr 
                          key={assembly.id}
                          onClick={() => navigate(`/engineer/assembly/${assembly.id}`)}
                          className="hover:bg-gray-50 cursor-pointer transition"
                        >
                          {/* Type */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(assembly.tipo)}`}>
                              {getTypeLabel(assembly.tipo)}
                            </span>
                          </td>
                          {/* Assembly */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{assembly.maquina} / {assembly.modelo}</div>
                            <div className="text-sm text-gray-500">{assembly.numero}</div>
                          </td>
                          {/* Responsible */}
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                            {assembly.userName}
                          </td>
                          {/* Progress */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-600 w-8">{progress}%</span>
                              <div className="w-full bg-gray-200 rounded-full h-2.5 ml-2">
                                <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                          </td>
                          {/* Dates */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              Inicio: {assembly.fechaInicio || new Date(assembly.createdAt?.seconds * 1000).toLocaleDateString('es-MX')}
                            </div>
                            <div className="text-sm text-red-600">
                              Deadline: {assembly.fechaDeadline || 'Sin definir'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista de cards para móvil */}
              <div className="md:hidden divide-y divide-gray-200">
                {assemblies.map((assembly) => {
                  const progress = calculateProgress(assembly);
                  return (
                    <div
                      key={assembly.id}
                      onClick={() => navigate(`/engineer/assembly/${assembly.id}`)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
                    >
                      {/* Header con tipo y máquina */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getTypeColor(assembly.tipo)}`}>
                              {getTypeLabel(assembly.tipo)}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-gray-900">
                            {assembly.maquina} / {assembly.modelo}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">#{assembly.numero}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 shrink-0 mt-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>

                      {/* Responsable */}
                      <div className="mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span className="text-sm text-gray-600">{assembly.userName}</span>
                      </div>

                      {/* Progreso */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-600">Progreso</span>
                          <span className="text-xs font-bold text-sky-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              progress === 100 ? 'bg-green-500' :
                              progress >= 75 ? 'bg-sky-600' :
                              progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Fechas */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Inicio</p>
                          <p className="text-xs text-gray-900 font-semibold mt-0.5">
                            {assembly.fechaInicio || new Date(assembly.createdAt?.seconds * 1000).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Deadline</p>
                          <p className="text-xs text-red-600 font-semibold mt-0.5">
                            {assembly.fechaDeadline || 'Sin definir'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Assembly Modal */}
      {isModalOpen && (
        <AssemblyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateAssembly}
          userName={userProfile?.name || currentUser.email}
        />
      )}
    </div>
  );
};

export default EngineerDashboard;
