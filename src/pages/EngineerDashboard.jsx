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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        {/* Section Header and Action Button */}
        <div className="flex items-center justify-between mb-5 px-4 sm:px-0">
          <h2 className="text-2xl font-semibold text-gray-800">
            Ensambles Activos
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
          >
            {/* Plus Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Registrar Nuevo Ensamble
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {assemblies.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="text-gray-500 text-lg">No tienes ensambles registrados</p>
              <p className="text-gray-400 text-sm mt-2">Haz clic en "Registrar Nuevo Ensamble" para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      Progreso
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
                        onClick={() => navigate(`/assembly/${assembly.id}`)}
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
