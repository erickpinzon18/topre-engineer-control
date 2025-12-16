import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, getDoc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, 
  query, where, getDocs, orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const WeeklyMeetingDetail = () => {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [weekData, setWeekData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userAssemblies, setUserAssemblies] = useState([]);
  const [selectedAssembly, setSelectedAssembly] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);

  const statusColors = {
    pendiente: 'bg-gray-200 text-gray-700',
    en_proceso: 'bg-yellow-200 text-yellow-800',
    terminado: 'bg-green-200 text-green-800',
    cancelado: 'bg-red-200 text-red-800'
  };

  const statusLabels = {
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    terminado: 'Terminado',
    cancelado: 'Cancelado'
  };

  const areaColors = {
    'ASSY': 'bg-sky-100 text-sky-800 border-sky-300',
    'PRESS': 'bg-orange-100 text-orange-800 border-orange-300',
    'HOT-PRESS': 'bg-red-100 text-red-800 border-red-300'
  };

  // Obtener fecha de inicio de una semana dado su ID
  const getWeekDates = (weekId) => {
    const [year, week] = weekId.split('-W');
    const yearNum = parseInt(year);
    const weekNum = parseInt(week);
    
    const firstDayOfYear = new Date(yearNum, 0, 1);
    const daysToMonday = (8 - firstDayOfYear.getDay()) % 7;
    const firstMonday = new Date(yearNum, 0, 1 + daysToMonday);
    
    const startDate = new Date(firstMonday);
    startDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    return { startDate, endDate };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Cargar o crear semana
  useEffect(() => {
    const loadWeek = async () => {
      const weekRef = doc(db, 'weeklyMeetings', weekId);
      const weekSnap = await getDoc(weekRef);
      
      if (weekSnap.exists()) {
        setWeekData(weekSnap.data());
      } else {
        // Crear la semana si no existe
        const { startDate, endDate } = getWeekDates(weekId);
        const [year, week] = weekId.split('-W');
        const newWeekData = {
          weekNumber: parseInt(week),
          year: parseInt(year),
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          createdAt: new Date()
        };
        await setDoc(weekRef, newWeekData);
        setWeekData(newWeekData);
      }
      setLoading(false);
    };
    
    loadWeek();
  }, [weekId]);

  // Listener en tiempo real para entries
  useEffect(() => {
    const entriesRef = collection(db, 'weeklyMeetings', weekId, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(entriesData);
    }, (error) => {
      console.error('Error en listener:', error);
    });

    return () => unsubscribe();
  }, [weekId]);

  // Cargar ensambles del usuario
  const loadUserAssemblies = async () => {
    try {
      const assembliesRef = collection(db, 'assemblies');
      const q = query(assembliesRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const assemblies = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar los que ya están agregados esta semana
      const existingIds = entries.map(e => e.assemblyId);
      const available = assemblies.filter(a => !existingIds.includes(a.id));
      
      setUserAssemblies(available);
    } catch (error) {
      console.error('Error cargando ensambles:', error);
    }
  };

  const handleOpenAddModal = () => {
    loadUserAssemblies();
    setShowAddModal(true);
  };

  const handleAddEntry = async () => {
    if (!selectedAssembly) return;

    const assembly = userAssemblies.find(a => a.id === selectedAssembly);
    if (!assembly) return;

    try {
      // Determinar área basado en la sección del usuario o tipo de ensamble
      let area = 'ASSY';
      if (userProfile?.section === 'press') area = 'PRESS';
      else if (userProfile?.section === 'hot-press') area = 'HOT-PRESS';

      const entriesRef = collection(db, 'weeklyMeetings', weekId, 'entries');
      await addDoc(entriesRef, {
        assemblyId: assembly.id,
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.email,
        area: area,
        tipo: assembly.tipo || 'QC',
        maquina: assembly.maquina,
        modelo: assembly.modelo,
        numero: assembly.numero,
        status: 'pendiente',
        comentarios: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setShowAddModal(false);
      setSelectedAssembly('');
    } catch (error) {
      console.error('Error agregando entrada:', error);
      alert('Error al agregar la entrada');
    }
  };

  const handleUpdateStatus = async (entryId, newStatus) => {
    try {
      const entryRef = doc(db, 'weeklyMeetings', weekId, 'entries', entryId);
      await updateDoc(entryRef, {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error actualizando status:', error);
    }
  };

  const handleUpdateComments = async (entryId, comentarios) => {
    try {
      const entryRef = doc(db, 'weeklyMeetings', weekId, 'entries', entryId);
      await updateDoc(entryRef, {
        comentarios: comentarios,
        updatedAt: new Date()
      });
      setEditingEntry(null);
    } catch (error) {
      console.error('Error actualizando comentarios:', error);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('¿Eliminar esta entrada?')) return;
    
    try {
      const entryRef = doc(db, 'weeklyMeetings', weekId, 'entries', entryId);
      await deleteDoc(entryRef);
    } catch (error) {
      console.error('Error eliminando entrada:', error);
    }
  };

  const getDetailRoute = (entry) => {
    const baseRoute = entry.area === 'PRESS' ? '/engineer/press' : 
                      entry.area === 'HOT-PRESS' ? '/engineer/hot-press' : 
                      '/engineer/assembly';
    return `${baseRoute}/${entry.assemblyId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reunión...</p>
        </div>
      </div>
    );
  }

  const { startDate, endDate } = getWeekDates(weekId);

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/meetings')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Volver a Reuniones
          </button>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-5 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Reunión Semanal</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">Semana {weekData?.weekNumber}</h1>
              <p className="text-indigo-100 mt-1">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <p className="text-xs text-indigo-200">Entradas</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="bg-white text-indigo-600 font-bold py-2.5 px-4 rounded-lg shadow hover:bg-indigo-50 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Real-time indicator */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Actualización en tiempo real
        </div>

        {/* Entries Table */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <p className="text-gray-500 text-lg">No hay entradas esta semana</p>
              <p className="text-gray-400 text-sm mt-2">Haz clic en "Agregar" para añadir tus máquinas</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Área</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Máquina</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Modelo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Número</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Responsable</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Comentarios</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-bold rounded border ${areaColors[entry.area] || 'bg-gray-100 text-gray-700'}`}>
                            {entry.area}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{entry.tipo}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">{entry.maquina}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{entry.modelo}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600 font-mono">#{entry.numero}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{entry.userName}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={entry.status}
                            onChange={(e) => handleUpdateStatus(entry.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border-0 ${statusColors[entry.status]}`}
                          >
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          {editingEntry === entry.id ? (
                            <input
                              type="text"
                              defaultValue={entry.comentarios}
                              onBlur={(e) => handleUpdateComments(entry.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateComments(entry.id, e.target.value);
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          ) : (
                            <div
                              onClick={() => entry.userId === currentUser.uid && setEditingEntry(entry.id)}
                              className={`text-sm text-gray-600 truncate ${entry.userId === currentUser.uid ? 'cursor-pointer hover:bg-gray-100 px-2 py-1 -mx-2 -my-1 rounded' : ''}`}
                              title={entry.comentarios || 'Sin comentarios'}
                            >
                              {entry.comentarios || 'Sin comentarios'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(getDetailRoute(entry))}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                              title="Ver detalles"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </button>
                            {entry.userId === currentUser.uid && (
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Eliminar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-200">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded border ${areaColors[entry.area]}`}>
                            {entry.area}
                          </span>
                          <span className="text-xs text-gray-500">{entry.tipo}</span>
                        </div>
                        <h3 className="font-bold text-gray-900">{entry.maquina} / {entry.modelo}</h3>
                        <p className="text-sm text-gray-600">#{entry.numero}</p>
                        <p className="text-xs text-gray-500 mt-1">Por: {entry.userName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <select
                          value={entry.status}
                          onChange={(e) => handleUpdateStatus(entry.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-bold ${statusColors[entry.status]}`}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => navigate(getDetailRoute(entry))}
                          className="text-xs text-indigo-600 font-medium"
                        >
                          Ver detalles →
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-sm text-gray-600">
                      {entry.comentarios || 'Sin comentarios'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Agregar Máquina</h3>
            
            {userAssemblies.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No tienes máquinas disponibles para agregar</p>
                <p className="text-sm text-gray-400 mt-1">Todas ya están en esta reunión o no tienes ensambles registrados</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona una máquina
                  </label>
                  <select
                    value={selectedAssembly}
                    onChange={(e) => setSelectedAssembly(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {userAssemblies.map((assembly) => (
                      <option key={assembly.id} value={assembly.id}>
                        {assembly.maquina} / {assembly.modelo} - #{assembly.numero}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedAssembly('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancelar
              </button>
              {userAssemblies.length > 0 && (
                <button
                  onClick={handleAddEntry}
                  disabled={!selectedAssembly}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMeetingDetail;
