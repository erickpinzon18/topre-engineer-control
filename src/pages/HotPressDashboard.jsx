import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Calendar from '../components/Calendar';
import ReportModal from '../components/ReportModal';
import HotPressModal from '../components/HotPressModal';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const HotPressDashboard = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const [assemblies, setAssemblies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
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
      
      const assembliesData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const assemblyData = {
            id: doc.id,
            ...doc.data()
          };
          
          try {
            const historyQuery = query(
              collection(db, 'assemblies', doc.id, 'history'),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            
            const historySnapshot = await getDocs(historyQuery);
            
            if (!historySnapshot.empty) {
              const lastRecordDoc = historySnapshot.docs[0];
              assemblyData.lastRecord = lastRecordDoc.data();
            }
          } catch (historyError) {
            console.error('Error cargando historial:', historyError);
          }
          
          return assemblyData;
        })
      );
      
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

  // Separar ensambles por tipo
  const qcAssemblies = assemblies.filter(a => a.tipo === 'QC');
  const laserAssemblies = assemblies.filter(a => a.tipo === 'LASER');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />

      <main className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          
          <div className="lg:col-span-9 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                Mis Ajustes - Hot Press
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="hidden sm:inline">Generar Reporte</span>
                  <span className="sm:hidden">Reporte</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="hidden sm:inline">Registrar Nuevo Ajuste</span>
                  <span className="sm:hidden">Nuevo Ajuste</span>
                </button>
              </div>
            </div>

            {assemblies.length === 0 ? (
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="text-center py-12 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <p className="text-gray-500 text-base sm:text-lg">No tienes ajustes registrados</p>
                  <p className="text-gray-400 text-sm mt-2">Haz clic en "Registrar Nuevo Ajuste" para comenzar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
            
                {/* Sección QC Level Up */}
                {qcAssemblies.length > 0 && (
                  <div className="bg-white shadow-lg rounded-lg overflow-hidden border-l-4 border-blue-500">
                    <div className="px-4 sm:px-6 py-4 bg-linear-to-r from-blue-50 to-sky-50 border-b-2 border-blue-200">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900">QC - Level Up</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{qcAssemblies.length} {qcAssemblies.length === 1 ? 'ajuste' : 'ajustes'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vista desktop QC */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Máquina</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Modelo</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Número</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">% Actual</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Comentarios</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Fechas</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {qcAssemblies.map((assembly) => {
                            const lastRecord = assembly.lastRecord || {};
                            const recordData = lastRecord.data || lastRecord;
                            
                            let porcentaje = recordData.porcentajeObtenido || 0;
                            if (porcentaje === 0 && (recordData.mikomi || recordData.atari || recordData.ajustesExtras)) {
                              let cumplidos = 0;
                              if (recordData.mikomi === 'OK') cumplidos++;
                              if (recordData.atari === 'OK') cumplidos++;
                              if (recordData.ajustesExtras === 'OK') cumplidos++;
                              porcentaje = Math.round((cumplidos / 3) * 100);
                            }
                            
                            const estado = porcentaje === 100 ? 'OK' : (recordData.estado || 'Pendiente');
                            const meta = parseFloat(assembly.porcentajeMeta || '97');
                            
                            return (
                              <tr 
                                key={assembly.id}
                                onClick={() => navigate(`/engineer/hot-press/${assembly.id}`)}
                                className="hover:bg-blue-50 cursor-pointer transition"
                              >
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                    QC
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-gray-900">{assembly.maquina}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-700">{assembly.modelo}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-600 font-mono">#{assembly.numero}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-sm font-bold ${
                                      porcentaje >= meta ? 'text-green-600' :
                                      porcentaje >= (meta * 0.93) ? 'text-blue-600' :
                                      'text-red-600'
                                    }`}>
                                      {Math.round(porcentaje)}%
                                    </span>
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          porcentaje >= meta ? 'bg-green-500' :
                                          porcentaje >= (meta * 0.93) ? 'bg-blue-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-3 py-1.5 inline-flex text-xs font-bold rounded-full border-2 ${
                                    estado === 'OK' 
                                      ? 'bg-green-100 text-green-800 border-green-300' 
                                      : estado === 'NG'
                                      ? 'bg-red-100 text-red-800 border-red-300'
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}>
                                    {estado}
                                  </span>
                                </td>
                                <td className="px-4 py-3 max-w-xs">
                                  <div className="text-xs text-gray-600 truncate" title={recordData.comentarios || 'Sin comentarios'}>
                                    {recordData.comentarios || 'Sin comentarios'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-xs text-gray-700 font-medium">
                                    Inicio: {assembly.fechaInicio || new Date(assembly.createdAt?.seconds * 1000).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                                  </div>
                                  <div className="text-xs text-red-600 font-semibold">
                                    Deadline: {assembly.fechaDeadline || 'N/A'}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista móvil QC */}
                    <div className="lg:hidden divide-y divide-gray-200">
                      {qcAssemblies.map((assembly) => {
                        const lastRecord = assembly.lastRecord || {};
                        const recordData = lastRecord.data || lastRecord;
                        
                        let porcentaje = recordData.porcentajeObtenido || 0;
                        if (porcentaje === 0 && (recordData.mikomi || recordData.atari || recordData.ajustesExtras)) {
                          let cumplidos = 0;
                          if (recordData.mikomi === 'OK') cumplidos++;
                          if (recordData.atari === 'OK') cumplidos++;
                          if (recordData.ajustesExtras === 'OK') cumplidos++;
                          porcentaje = Math.round((cumplidos / 3) * 100);
                        }
                        
                        const estado = porcentaje === 100 ? 'OK' : (recordData.estado || 'Pendiente');
                        const meta = parseFloat(assembly.porcentajeMeta || '97');
                        
                        return (
                          <div
                            key={assembly.id}
                            onClick={() => navigate(`/engineer/hot-press/${assembly.id}`)}
                            className="p-4 hover:bg-blue-50 cursor-pointer transition"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                    QC
                                  </span>
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border-2 ${
                                    estado === 'OK' 
                                      ? 'bg-green-100 text-green-800 border-green-300' 
                                      : estado === 'NG'
                                      ? 'bg-red-100 text-red-800 border-red-300'
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}>
                                    {estado}
                                  </span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900">{assembly.maquina} / {assembly.modelo}</h3>
                                <p className="text-sm text-gray-600 mt-0.5">#{assembly.numero}</p>
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </div>

                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600 font-medium">Porcentaje Actual</span>
                                <span className={`text-sm font-bold ${
                                  porcentaje >= meta ? 'text-green-600' :
                                  porcentaje >= (meta * 0.93) ? 'text-blue-600' :
                                  'text-red-600'
                                }`}>
                                  {Math.round(porcentaje)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    porcentaje >= meta ? 'bg-green-500' :
                                    porcentaje >= (meta * 0.93) ? 'bg-blue-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Inicio</p>
                                <p className="text-xs text-gray-900 font-semibold">
                                  {assembly.fechaInicio || new Date(assembly.createdAt?.seconds * 1000).toLocaleDateString('es-MX')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Deadline</p>
                                <p className="text-xs text-red-600 font-semibold">
                                  {assembly.fechaDeadline || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sección AJUSTE EN LASER */}
                {laserAssemblies.length > 0 && (
                  <div className="bg-white shadow-lg rounded-lg overflow-hidden border-l-4 border-purple-500">
                    <div className="px-4 sm:px-6 py-4 bg-linear-to-r from-purple-50 to-violet-50 border-b-2 border-purple-200">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-600 p-2 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900">Ajuste en Laser</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{laserAssemblies.length} {laserAssemblies.length === 1 ? 'ajuste' : 'ajustes'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vista desktop LASER */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Máquina</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Modelo</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Número</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">% Actual</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Comentarios</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Fechas</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {laserAssemblies.map((assembly) => {
                            const lastRecord = assembly.lastRecord || {};
                            const recordData = lastRecord.data || lastRecord;
                            
                            const porcentaje = parseFloat(recordData.porcentajeObtenido) || 0;
                            const pruebaEnsamble = recordData.pruebaEnsamble || 'Pendiente';
                            
                            return (
                              <tr 
                                key={assembly.id}
                                onClick={() => navigate(`/engineer/hot-press/${assembly.id}`)}
                                className="hover:bg-purple-50 cursor-pointer transition"
                              >
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                    LASER
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-gray-900">{assembly.maquina}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-700">{assembly.modelo}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-700">{assembly.numero}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-sm font-bold ${
                                      porcentaje >= 97 ? 'text-green-600' :
                                      porcentaje >= 90 ? 'text-purple-600' :
                                      'text-red-600'
                                    }`}>
                                      {porcentaje}%
                                    </span>
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          porcentaje >= 97 ? 'bg-green-500' :
                                          porcentaje >= 90 ? 'bg-purple-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-3 py-1.5 inline-flex text-xs font-bold rounded-full border-2 ${
                                    pruebaEnsamble === 'OK' 
                                      ? 'bg-green-100 text-green-800 border-green-300' 
                                      : pruebaEnsamble === 'NG'
                                      ? 'bg-red-100 text-red-800 border-red-300'
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}>
                                    {pruebaEnsamble}
                                  </span>
                                </td>
                                <td className="px-4 py-3 max-w-xs">
                                  <div className="text-xs text-gray-600 truncate" title={recordData.comentarios || 'Sin comentarios'}>
                                    {recordData.comentarios || 'Sin comentarios'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-xs text-gray-700 font-medium">
                                    Inicio: {assembly.fechaInicio || new Date(assembly.createdAt?.seconds * 1000).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                                  </div>
                                  <div className="text-xs text-red-600 font-semibold">
                                    Deadline: {assembly.fechaDeadline || 'N/A'}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista móvil LASER */}
                    <div className="lg:hidden divide-y divide-gray-200">
                      {laserAssemblies.map((assembly) => {
                        const lastRecord = assembly.lastRecord || {};
                        const recordData = lastRecord.data || lastRecord;
                        
                        const porcentaje = parseFloat(recordData.porcentajeObtenido) || 0;
                        const pruebaEnsamble = recordData.pruebaEnsamble || 'Pendiente';
                        
                        return (
                          <div
                            key={assembly.id}
                            onClick={() => navigate(`/engineer/hot-press/${assembly.id}`)}
                            className="p-4 hover:bg-purple-50 cursor-pointer transition"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                    LASER
                                  </span>
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border-2 ${
                                    pruebaEnsamble === 'OK' 
                                      ? 'bg-green-100 text-green-800 border-green-300' 
                                      : pruebaEnsamble === 'NG'
                                      ? 'bg-red-100 text-red-800 border-red-300'
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}>
                                    {pruebaEnsamble}
                                  </span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900">{assembly.maquina} / {assembly.modelo}</h3>
                                <p className="text-sm text-gray-600 mt-0.5">#{assembly.numero}</p>
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </div>

                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600 font-medium">Porcentaje Actual</span>
                                <span className={`text-sm font-bold ${
                                  porcentaje >= 97 ? 'text-green-600' :
                                  porcentaje >= 90 ? 'text-purple-600' :
                                  'text-red-600'
                                }`}>
                                  {porcentaje}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    porcentaje >= 97 ? 'bg-green-500' :
                                    porcentaje >= 90 ? 'bg-purple-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Inicio</p>
                                <p className="text-xs text-gray-900 font-semibold">
                                  {assembly.fechaInicio || new Date(assembly.createdAt?.seconds * 1000).toLocaleDateString('es-MX')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Deadline</p>
                                <p className="text-xs text-red-600 font-semibold">
                                  {assembly.fechaDeadline || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <Calendar assemblies={assemblies} />
          </div>

        </div>
      </main>

      {isModalOpen && (
        <HotPressModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateAssembly}
          userName={userProfile?.name || currentUser.email}
        />
      )}

      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          assemblies={assemblies}
        />
      )}
    </div>
  );
};

export default HotPressDashboard;
