import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const AssemblyView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [assembly, setAssembly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadAssembly();
    loadHistory();
  }, [id]);

  const loadAssembly = async () => {
    try {
      const assemblyRef = doc(db, 'assemblies', id);
      const assemblySnap = await getDoc(assemblyRef);
      
      if (assemblySnap.exists()) {
        setAssembly({ id: assemblySnap.id, ...assemblySnap.data() });
      } else {
        alert('Ensamble no encontrado');
        navigate('/admin');
      }
    } catch (error) {
      console.error('Error cargando ensamble:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const historyRef = collection(db, 'assemblies', id, 'history');
      const historySnapshot = await getDocs(query(historyRef, orderBy('createdAt', 'desc')));
      
      const historyData = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setHistory(historyData);
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  };

  const calculateDaysRemaining = () => {
    if (!assembly?.fechaDeadline) return 0;
    const deadline = new Date(assembly.fechaDeadline);
    const today = new Date();
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return diff;
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

  if (!assembly) {
    return null;
  }

  const daysRemaining = calculateDaysRemaining();
  const progress = assembly.progress || 0;

  const fieldLabels = {
    fechaAjuste: 'Fecha de Ajuste',
    emisionPuntoCambio: 'Emisión Punto de Cambio',
    porcentajeObtenido: 'Porcentaje Obtenido',
    estado: 'Estado',
    comentarios: 'Comentarios',
    linkReporteIR: 'Link Reporte IR',
    tiempoEstablecidoJig1: 'Tiempo Establecido Jig 1 (seg)',
    tiempoObtenidoJig1: 'Tiempo Obtenido Jig 1 (seg)',
    mejoraPorcentajeJig1: 'Mejora Jig 1 (%)',
    tiempoEstablecidoJig2: 'Tiempo Establecido Jig 2 (seg)',
    tiempoObtenidoJig2: 'Tiempo Obtenido Jig 2 (seg)',
    mejoraPorcentajeJig2: 'Mejora Jig 2 (%)',
    pzDestructivaJig1: 'Piezas Destructiva Jig 1',
    pzDestructivaJig2: 'Piezas Destructiva Jig 2',
    resultadoDestructivaJig1: 'Resultado Destructiva Jig 1',
    resultadoDestructivaJig2: 'Resultado Destructiva Jig 2'
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Back Button */}
        <div className="mb-3 sm:mb-4">
          <button
            onClick={() => navigate('/admin')}
            className="text-xs sm:text-sm font-medium text-sky-700 hover:text-sky-900 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="hidden sm:inline">Volver al Dashboard Admin</span>
            <span className="sm:hidden">Volver</span>
          </button>
        </div>

        {/* Header Card */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-4 sm:mb-6 border-l-4 border-sky-600">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
              <div>
                <span className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  assembly.tipo === 'QC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {assembly.tipo === 'QC' ? 'QC - LEVEL UP' : 'TEACH'}
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">
                  {assembly.maquina} / {assembly.modelo}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Número: {assembly.numero}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-2">
                  <span className="font-semibold">Ingeniero:</span> {assembly.userName}
                </p>
              </div>
              
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="mb-3">
                  <p className="text-xs sm:text-sm text-gray-500">Progreso</p>
                  <p className="text-3xl sm:text-4xl font-bold text-sky-600">{progress}%</p>
                </div>
                <div className="w-full sm:w-40 bg-gray-200 rounded-full h-2.5 sm:h-3 shadow-inner">
                  <div 
                    className={`h-2.5 sm:h-3 rounded-full transition-all ${
                      progress === 100 ? 'bg-green-500' :
                      progress >= 75 ? 'bg-blue-500' :
                      progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Deadline Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Fecha de Deadline</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{assembly.fechaDeadline}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500">Días restantes</p>
                  <p className={`text-base sm:text-lg font-bold ${
                    daysRemaining < 0 ? 'text-red-600' :
                    daysRemaining <= 7 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)} días de retraso` : `${daysRemaining} días`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 sm:px-6 py-4 sm:py-5 bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="bg-sky-600 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    Historial de Registros
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 font-medium">
                    {history.length} {history.length === 1 ? 'registro guardado' : 'registros guardados'}
                  </p>
                </div>
              </div>
              <div className="bg-sky-100 text-sky-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm">
                Total: {history.length}
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 bg-gray-50">
            {history.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <p className="text-gray-500 font-medium text-sm sm:text-base">No hay registros guardados</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">El ingeniero aún no ha registrado información</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {history.map((record, index) => (
                  <div 
                    key={record.id} 
                    className={`border rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                      index === 0 
                        ? 'border-sky-400 shadow-md bg-linear-to-br from-sky-50 to-white' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Header */}
                    <div className={`px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 ${
                      index === 0 
                        ? 'bg-linear-to-r from-sky-500 to-sky-600 border-b border-sky-400' 
                        : 'bg-linear-to-r from-gray-100 to-gray-50 border-b border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-bold text-sm sm:text-base shadow-md ${
                          index === 0 
                            ? 'bg-white text-sky-600' 
                            : 'bg-gray-600 text-white'
                        }`}>
                          {history.length - index}
                        </div>
                        <div>
                          <h4 className={`text-xs sm:text-sm font-bold ${
                            index === 0 ? 'text-white' : 'text-gray-900'
                          }`}>
                            Registro #{history.length - index}
                            {index === 0 && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-white text-sky-600 rounded-full">
                                Actual
                              </span>
                            )}
                          </h4>
                          <p className={`text-xs mt-1 ${
                            index === 0 ? 'text-sky-100' : 'text-gray-500'
                          }`}>
                            {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString('es-MX', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Fecha no disponible'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Badge de solo lectura */}
                      <div className={`px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs ${
                        index === 0 ? 'bg-white text-sky-600' : 'bg-gray-200 text-gray-600'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Vista
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-5">
                      {/* User Info */}
                      <div className="mb-4 sm:mb-5 pb-3 sm:pb-4 border-b-2 border-gray-100 flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Guardado por</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-900">{record.savedBy}</p>
                        </div>
                      </div>

                      {/* Data Table */}
                      <div className="space-y-2">
                        {Object.entries(record.data || {}).map(([key, value]) => {
                          if (!value && value !== 0) return null;
                          
                          const isEstado = key === 'estado';
                          const isResultadoDestructiva = key === 'resultadoDestructivaJig1' || key === 'resultadoDestructivaJig2';
                          const isMejora = key === 'mejoraPorcentajeJig1' || key === 'mejoraPorcentajeJig2';
                          
                          return (
                            <div key={key} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                              <p className="text-xs text-gray-600 font-medium mb-1">
                                {fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <div className="text-sm font-semibold text-gray-900">
                                {(isEstado || isResultadoDestructiva) ? (
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                    value === 'OK' 
                                      ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                                      : value === 'NG'
                                      ? 'bg-red-100 text-red-800 border-2 border-red-300'
                                      : 'bg-gray-100 text-gray-800 border-2 border-gray-200'
                                  }`}>
                                    {value}
                                  </span>
                                ) : isMejora ? (
                                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${
                                    parseFloat(value) > 0
                                      ? 'bg-linear-to-r from-green-100 to-green-50 text-green-700 border-2 border-green-300'
                                      : parseFloat(value) < 0
                                      ? 'bg-linear-to-r from-red-100 to-red-50 text-red-700 border-2 border-red-300'
                                      : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                                  }`}>
                                    {parseFloat(value) > 0 ? '↑ ' : parseFloat(value) < 0 ? '↓ ' : ''}{value}%
                                  </span>
                                ) : (
                                  <span className="text-gray-900">{value}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Comparison with previous record */}
                      {index < history.length - 1 && assembly.tipo === 'QC' && (
                        <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t-2 border-gray-200">
                          {(() => {
                            const currentPercent = parseFloat(record.data?.porcentajeObtenido);
                            const previousPercent = parseFloat(history[index + 1].data?.porcentajeObtenido);
                            
                            if (!isNaN(currentPercent) && !isNaN(previousPercent)) {
                              const diff = currentPercent - previousPercent;
                              const isImprovement = diff > 0;
                              
                              return (
                                <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg space-y-2 sm:space-y-0 ${
                                  isImprovement 
                                    ? 'bg-green-50 border-l-4 border-green-500' 
                                    : diff < 0 
                                    ? 'bg-red-50 border-l-4 border-red-500' 
                                    : 'bg-gray-50 border-l-4 border-gray-400'
                                }`}>
                                  <span className="text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 mr-2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                    </svg>
                                    Variación vs. registro anterior:
                                  </span>
                                  <span className={`text-sm sm:text-base font-bold px-2 sm:px-3 py-1 rounded-lg ${
                                    isImprovement 
                                      ? 'text-green-700 bg-green-100' 
                                      : diff < 0 
                                      ? 'text-red-700 bg-red-100' 
                                      : 'text-gray-700 bg-gray-100'
                                  }`}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                                    {isImprovement ? ' ↑' : diff < 0 ? ' ↓' : ' →'}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssemblyView;
