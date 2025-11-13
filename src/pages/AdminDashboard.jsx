import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState([]);
  const [expandedAssemblies, setExpandedAssemblies] = useState({});
  const [stats, setStats] = useState({
    activeAssemblies: 0,
    completedLast7Days: 0,
    averageProgress: 0
  });

  const toggleAssemblyDetails = (assemblyId) => {
    setExpandedAssemblies(prev => ({
      ...prev,
      [assemblyId]: !prev[assemblyId]
    }));
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Obtener todos los ensambles
      const assembliesRef = collection(db, 'assemblies');
      const assembliesSnapshot = await getDocs(assembliesRef);
      
      const allAssemblies = await Promise.all(
        assembliesSnapshot.docs.map(async (doc) => {
          const assemblyData = {
            id: doc.id,
            ...doc.data()
          };

          // Cargar historial para calcular estadísticas
          const historyRef = collection(db, 'assemblies', doc.id, 'history');
          const historySnapshot = await getDocs(query(historyRef, orderBy('createdAt', 'desc')));
          
          const history = historySnapshot.docs.map(historyDoc => ({
            id: historyDoc.id,
            ...historyDoc.data()
          }));

          // Calcular estadísticas según el tipo
          let assemblyStats = {};

          if (assemblyData.tipo === 'QC' && history.length > 0) {
            // Estadísticas QC
            const percentages = history
              .map(h => parseFloat(h.data?.porcentajeObtenido))
              .filter(p => !isNaN(p));

            if (percentages.length > 0) {
              const firstPercent = percentages[percentages.length - 1];
              const lastPercent = percentages[0];
              const maxPercent = Math.max(...percentages);
              const minPercent = Math.min(...percentages);
              const avgPercent = percentages.reduce((a, b) => a + b, 0) / percentages.length;
              const improvement = lastPercent - firstPercent;

              assemblyStats = {
                totalRecords: history.length,
                firstPercent: firstPercent.toFixed(2),
                lastPercent: lastPercent.toFixed(2),
                maxPercent: maxPercent.toFixed(2),
                minPercent: minPercent.toFixed(2),
                avgPercent: avgPercent.toFixed(2),
                improvement: improvement.toFixed(2),
                improvementPositive: improvement > 0,
                hasReachedGoal: lastPercent >= 97,
                percentHistory: percentages
              };
            }
          } else if (assemblyData.tipo === 'TEACH' && history.length > 0) {
            // Estadísticas TEACH
            const jig1Improvements = [];
            const jig2Improvements = [];
            let destructiveTestsOK = 0;
            let destructiveTestsNG = 0;

            history.forEach(h => {
              // Mejoras de tiempo Jig 1
              const mejora1 = parseFloat(h.data?.mejoraPorcentajeJig1);
              if (!isNaN(mejora1)) {
                jig1Improvements.push(mejora1);
              }

              // Mejoras de tiempo Jig 2
              const mejora2 = parseFloat(h.data?.mejoraPorcentajeJig2);
              if (!isNaN(mejora2)) {
                jig2Improvements.push(mejora2);
              }

              // Resultados destructivos
              if (h.data?.resultadoDestructivaJig1 === 'OK') destructiveTestsOK++;
              if (h.data?.resultadoDestructivaJig1 === 'NG') destructiveTestsNG++;
              if (h.data?.resultadoDestructivaJig2 === 'OK') destructiveTestsOK++;
              if (h.data?.resultadoDestructivaJig2 === 'NG') destructiveTestsNG++;
            });

            assemblyStats = {
              totalRecords: history.length,
              jig1Stats: jig1Improvements.length > 0 ? {
                avgImprovement: (jig1Improvements.reduce((a, b) => a + b, 0) / jig1Improvements.length).toFixed(2),
                maxImprovement: Math.max(...jig1Improvements).toFixed(2),
                minImprovement: Math.min(...jig1Improvements).toFixed(2),
                lastImprovement: jig1Improvements[0].toFixed(2)
              } : null,
              jig2Stats: jig2Improvements.length > 0 ? {
                avgImprovement: (jig2Improvements.reduce((a, b) => a + b, 0) / jig2Improvements.length).toFixed(2),
                maxImprovement: Math.max(...jig2Improvements).toFixed(2),
                minImprovement: Math.min(...jig2Improvements).toFixed(2),
                lastImprovement: jig2Improvements[0].toFixed(2)
              } : null,
              destructiveTests: {
                ok: destructiveTestsOK,
                ng: destructiveTestsNG,
                total: destructiveTestsOK + destructiveTestsNG,
                successRate: (destructiveTestsOK + destructiveTestsNG) > 0 
                  ? ((destructiveTestsOK / (destructiveTestsOK + destructiveTestsNG)) * 100).toFixed(1)
                  : 0
              }
            };
          }

          return {
            ...assemblyData,
            stats: assemblyStats
          };
        })
      );

      // Calcular estadísticas generales
      const activeAssemblies = allAssemblies.filter(a => a.progress < 100);
      
      // Ensambles completados en los últimos 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const completedLast7Days = allAssemblies.filter(a => {
        if (a.progress === 100 && a.updatedAt) {
          const updatedDate = a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
          return updatedDate >= sevenDaysAgo;
        }
        return false;
      });

      // Calcular progreso promedio de activos
      const avgProgress = activeAssemblies.length > 0
        ? Math.round(activeAssemblies.reduce((sum, a) => sum + (a.progress || 0), 0) / activeAssemblies.length)
        : 0;

      setStats({
        activeAssemblies: activeAssemblies.length,
        completedLast7Days: completedLast7Days.length,
        averageProgress: avgProgress
      });

      // Agrupar ensambles por ingeniero
      const engineersMap = {};

      allAssemblies.forEach(assembly => {
        const userId = assembly.userId;
        const userName = assembly.userName || 'Sin nombre';

        if (!engineersMap[userId]) {
          engineersMap[userId] = {
            id: userId,
            name: userName,
            activeAssemblies: [],
            completedAssemblies: []
          };
        }

        if (assembly.progress === 100) {
          engineersMap[userId].completedAssemblies.push(assembly);
        } else {
          engineersMap[userId].activeAssemblies.push(assembly);
        }
      });

      // Convertir a array y calcular estadísticas por ingeniero
      const engineersArray = Object.values(engineersMap).map(engineer => {
        const activeCount = engineer.activeAssemblies.length;
        const completedCount = engineer.completedAssemblies.length;
        const totalAssemblies = activeCount + completedCount;
        
        // Progreso promedio de activos
        const avgProgress = activeCount > 0
          ? Math.round(engineer.activeAssemblies.reduce((sum, a) => sum + (a.progress || 0), 0) / activeCount)
          : 0;

        // Contar por tipo
        const qcCount = [...engineer.activeAssemblies, ...engineer.completedAssemblies]
          .filter(a => a.tipo === 'QC').length;
        const teachCount = [...engineer.activeAssemblies, ...engineer.completedAssemblies]
          .filter(a => a.tipo === 'TEACH').length;

        // Ensambles con riesgo (deadline en 7 días o menos)
        const atRiskCount = engineer.activeAssemblies.filter(a => {
          const days = calculateDaysRemaining(a.fechaDeadline);
          return days <= 7 && days >= 0;
        }).length;

        // Ensambles retrasados (deadline pasado)
        const overdueCount = engineer.activeAssemblies.filter(a => {
          const days = calculateDaysRemaining(a.fechaDeadline);
          return days < 0;
        }).length;

        // Tasa de completitud
        const completionRate = totalAssemblies > 0
          ? Math.round((completedCount / totalAssemblies) * 100)
          : 0;

        // Promedio de días hasta deadline (solo activos)
        const avgDaysToDeadline = activeCount > 0
          ? Math.round(engineer.activeAssemblies.reduce((sum, a) => {
              const days = calculateDaysRemaining(a.fechaDeadline);
              return sum + days;
            }, 0) / activeCount)
          : 0;

        // Ensambles completados esta semana
        const completedThisWeek = engineer.completedAssemblies.filter(a => {
          if (a.updatedAt) {
            const updatedDate = a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
            return updatedDate >= sevenDaysAgo;
          }
          return false;
        }).length;

        return {
          ...engineer,
          stats: {
            averageProgress: avgProgress,
            totalAssemblies,
            qcCount,
            teachCount,
            atRiskCount,
            overdueCount,
            completionRate,
            avgDaysToDeadline,
            completedThisWeek
          }
        };
      });

      // Ordenar por número de ensambles activos (descendente)
      engineersArray.sort((a, b) => b.activeAssemblies.length - a.activeAssemblies.length);

      setEngineers(engineersArray);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (deadline) => {
    if (!deadline) return 0;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        <h2 className="text-2xl font-semibold text-gray-800 mb-5 px-4 sm:px-0">
          Resumen de Equipo
        </h2>

        {/* KPIs (Indicadores Clave) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {/* KPI 1: Ensambles Activos */}
          <div className="bg-white shadow-lg rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ensambles Activos</h4>
            <p className="text-3xl font-semibold text-sky-700">{stats.activeAssemblies}</p>
            <p className="text-sm text-gray-400 mt-1">Total en proceso</p>
          </div>
          
          {/* KPI 2: Terminados (Últimos 7 días) */}
          <div className="bg-white shadow-lg rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Terminados (Últ. 7 días)</h4>
            <p className="text-3xl font-semibold text-green-600">{stats.completedLast7Days}</p>
            <p className="text-sm text-gray-400 mt-1">Completados esta semana</p>
          </div>
          
          {/* KPI 3: Progreso Promedio (Activos) */}
          <div className="bg-white shadow-lg rounded-lg p-5">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Progreso Promedio (Activos)</h4>
            <p className="text-3xl font-semibold text-gray-800">{stats.averageProgress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: `${stats.averageProgress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Título de la sección de trabajadores */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-5 mt-10 px-4 sm:px-0">
          Actividad por Ingeniero
        </h2>

        {/* Contenedor de Tarjetas de Trabajador */}
        <div className="space-y-6">
          {engineers.length === 0 ? (
            <div className="bg-white shadow-lg rounded-lg p-8 text-center">
              <p className="text-gray-500">No hay ingenieros con ensambles asignados</p>
            </div>
          ) : (
            engineers.map((engineer) => (
              <div key={engineer.id} className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
                {/* Encabezado de la Tarjeta */}
                <div className="p-6 bg-gradient-to-r from-sky-50 to-blue-50 border-b-2 border-sky-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-sky-600 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{engineer.name}</h3>
                        <p className="text-sm text-gray-600 font-medium">
                          {engineer.stats.totalAssemblies} Ensamble{engineer.stats.totalAssemblies !== 1 ? 's' : ''} Total{engineer.stats.totalAssemblies !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-sky-200">
                        <p className="text-xs text-gray-500 font-medium">Tasa de Completitud</p>
                        <p className="text-2xl font-bold text-sky-600">{engineer.stats.completionRate}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progreso promedio del trabajador */}
                  {engineer.activeAssemblies.length > 0 && (
                    <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Progreso Promedio (Activos)</span>
                        <span className="text-sm font-bold text-sky-700">{engineer.stats.averageProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-sky-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm" 
                          style={{ width: `${engineer.stats.averageProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Panel de Estadísticas Detalladas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gray-50 border-b border-gray-200">
                  {/* Stat 1: Activos */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-500 uppercase">Activos</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{engineer.activeAssemblies.length}</p>
                  </div>

                  {/* Stat 2: Completados */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-500 uppercase">Completados</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{engineer.completedAssemblies.length}</p>
                    <p className="text-xs text-gray-500 mt-1">{engineer.stats.completedThisWeek} esta semana</p>
                  </div>

                  {/* Stat 3: En Riesgo */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-500 uppercase">En Riesgo</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{engineer.stats.atRiskCount}</p>
                    <p className="text-xs text-gray-500 mt-1">≤7 días restantes</p>
                  </div>

                  {/* Stat 4: Retrasados */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-500 uppercase">Retrasados</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{engineer.stats.overdueCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Deadline pasado</p>
                  </div>
                </div>

                {/* Estadísticas Secundarias */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-white border-b border-gray-200">
                  {/* Tipo QC */}
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase">QC Level Up</p>
                      <p className="text-xl font-bold text-blue-900">{engineer.stats.qcCount}</p>
                    </div>
                  </div>

                  {/* Tipo TEACH */}
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="bg-green-600 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase">TEACH</p>
                      <p className="text-xl font-bold text-green-900">{engineer.stats.teachCount}</p>
                    </div>
                  </div>

                  {/* Promedio días a deadline */}
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="bg-purple-600 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-purple-700 uppercase">Promedio Días</p>
                      <p className="text-xl font-bold text-purple-900">{engineer.stats.avgDaysToDeadline}</p>
                    </div>
                  </div>
                </div>

                {/* Tabla de ensambles del trabajador */}
                <div className="overflow-x-auto">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Detalle de Ensambles ({engineer.activeAssemblies.length + engineer.completedAssemblies.length})
                    </h4>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Ensamble</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Progreso</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estado</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Fechas</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estadísticas</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Ensambles Activos */}
                      {engineer.activeAssemblies.map((assembly) => {
                        const daysRemaining = calculateDaysRemaining(assembly.fechaDeadline);
                        const isOverdue = daysRemaining < 0;
                        const isAtRisk = daysRemaining >= 0 && daysRemaining <= 7;
                        const isExpanded = expandedAssemblies[assembly.id];
                        const hasStats = assembly.stats && assembly.stats.totalRecords > 0;
                        
                        return (
                          <>
                            <tr key={assembly.id} className="hover:bg-sky-50 transition-colors">
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="text-sm font-semibold text-gray-900">{assembly.maquina} / {assembly.modelo}</div>
                              </div>
                              <div className="text-xs text-gray-500 font-medium mt-1">#{assembly.numero}</div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                                assembly.tipo === 'QC' 
                                  ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                                  : 'bg-green-100 text-green-800 border-2 border-green-300'
                              }`}>
                                {assembly.tipo}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 w-20 bg-gray-200 rounded-full h-2 shadow-inner">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${
                                      assembly.progress >= 75 ? 'bg-green-500' :
                                      assembly.progress >= 50 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${assembly.progress || 0}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{assembly.progress || 0}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              {isOverdue ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border-2 border-red-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                  </svg>
                                  Retrasado
                                </span>
                              ) : isAtRisk ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                  </svg>
                                  En Riesgo
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border-2 border-green-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Activo
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className={`text-sm font-semibold ${
                                isOverdue ? 'text-red-700' : 
                                isAtRisk ? 'text-yellow-700' : 
                                'text-gray-700'
                              }`}>
                                {assembly.fechaDeadline}
                              </div>
                              <div className={`text-xs font-medium mt-1 ${
                                isOverdue ? 'text-red-600' : 
                                isAtRisk ? 'text-yellow-600' : 
                                'text-gray-500'
                              }`}>
                                {isOverdue ? `${Math.abs(daysRemaining)} días de retraso` : `${daysRemaining} días restantes`}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {hasStats ? (
                                  <button
                                    onClick={() => toggleAssemblyDetails(assembly.id)}
                                    className="inline-flex items-center px-3 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg font-semibold text-xs transition-all shadow-sm border border-sky-300"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                    {isExpanded ? 'Ocultar' : 'Ver Stats'}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Sin datos</span>
                                )}
                                <button
                                  onClick={() => navigate(`/admin/assembly/${assembly.id}`)}
                                  className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-all shadow-md"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Ver Detalles
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Fila expandible con estadísticas */}
                          {isExpanded && hasStats && (
                            <tr className="bg-gradient-to-r from-sky-50 to-blue-50">
                              <td colSpan="6" className="px-5 py-6">
                                {assembly.tipo === 'QC' && assembly.stats.firstPercent && (
                                  <div className="space-y-4">
                                    <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 text-blue-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                      </svg>
                                      Estadísticas QC - {assembly.stats.totalRecords} Registros
                                    </h5>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      {/* Mejora Total */}
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-200">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Mejora Total</p>
                                        <p className={`text-2xl font-bold ${
                                          assembly.stats.improvementPositive ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {assembly.stats.improvementPositive ? '+' : ''}{assembly.stats.improvement}%
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {assembly.stats.firstPercent}% → {assembly.stats.lastPercent}%
                                        </p>
                                      </div>

                                      {/* Promedio */}
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-200">
                                        <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Promedio</p>
                                        <p className="text-2xl font-bold text-blue-700">{assembly.stats.avgPercent}%</p>
                                        <p className="text-xs text-gray-500 mt-1">De todos los registros</p>
                                      </div>

                                      {/* Máximo */}
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-green-200">
                                        <p className="text-xs text-green-600 font-semibold uppercase mb-1">Máximo</p>
                                        <p className="text-2xl font-bold text-green-700">{assembly.stats.maxPercent}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Mejor resultado</p>
                                      </div>

                                      {/* Meta alcanzada */}
                                      <div className={`rounded-lg p-4 shadow-sm border-2 ${
                                        assembly.stats.hasReachedGoal 
                                          ? 'bg-green-50 border-green-300' 
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <p className={`text-xs font-semibold uppercase mb-1 ${
                                          assembly.stats.hasReachedGoal ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                          Meta (≥97%)
                                        </p>
                                        <p className={`text-2xl font-bold ${
                                          assembly.stats.hasReachedGoal ? 'text-green-700' : 'text-yellow-700'
                                        }`}>
                                          {assembly.stats.hasReachedGoal ? '✓ SI' : '✗ NO'}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          Actual: {assembly.stats.lastPercent}%
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {assembly.tipo === 'TEACH' && (assembly.stats.jig1Stats || assembly.stats.jig2Stats || assembly.stats.destructiveTests) && (
                                  <div className="space-y-4">
                                    <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 text-green-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                                      </svg>
                                      Estadísticas TEACH - {assembly.stats.totalRecords} Registros
                                    </h5>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      {/* Jig 1 Stats */}
                                      {assembly.stats.jig1Stats && (
                                        <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-200">
                                          <h6 className="text-sm font-bold text-blue-700 mb-3 flex items-center">
                                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                                            Jig 1 - Mejora de Tiempo
                                          </h6>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Última Mejora</p>
                                              <p className={`text-xl font-bold ${
                                                parseFloat(assembly.stats.jig1Stats.lastImprovement) > 0 ? 'text-green-600' : 'text-red-600'
                                              }`}>
                                                {parseFloat(assembly.stats.jig1Stats.lastImprovement) > 0 ? '↑' : '↓'} {assembly.stats.jig1Stats.lastImprovement}%
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Promedio</p>
                                              <p className="text-xl font-bold text-blue-600">{assembly.stats.jig1Stats.avgImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Máxima</p>
                                              <p className="text-lg font-bold text-green-600">{assembly.stats.jig1Stats.maxImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Mínima</p>
                                              <p className="text-lg font-bold text-gray-600">{assembly.stats.jig1Stats.minImprovement}%</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Jig 2 Stats */}
                                      {assembly.stats.jig2Stats && (
                                        <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-purple-200">
                                          <h6 className="text-sm font-bold text-purple-700 mb-3 flex items-center">
                                            <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                                            Jig 2 - Mejora de Tiempo
                                          </h6>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Última Mejora</p>
                                              <p className={`text-xl font-bold ${
                                                parseFloat(assembly.stats.jig2Stats.lastImprovement) > 0 ? 'text-green-600' : 'text-red-600'
                                              }`}>
                                                {parseFloat(assembly.stats.jig2Stats.lastImprovement) > 0 ? '↑' : '↓'} {assembly.stats.jig2Stats.lastImprovement}%
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Promedio</p>
                                              <p className="text-xl font-bold text-purple-600">{assembly.stats.jig2Stats.avgImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Máxima</p>
                                              <p className="text-lg font-bold text-green-600">{assembly.stats.jig2Stats.maxImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Mínima</p>
                                              <p className="text-lg font-bold text-gray-600">{assembly.stats.jig2Stats.minImprovement}%</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Destructive Tests */}
                                    {assembly.stats.destructiveTests && assembly.stats.destructiveTests.total > 0 && (
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-200">
                                        <h6 className="text-sm font-bold text-gray-700 mb-3">Pruebas Destructivas</h6>
                                        <div className="grid grid-cols-4 gap-4">
                                          <div className="text-center">
                                            <p className="text-xs text-gray-500 font-medium mb-1">Total Pruebas</p>
                                            <p className="text-2xl font-bold text-gray-700">{assembly.stats.destructiveTests.total}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-green-600 font-medium mb-1">OK Pasados</p>
                                            <p className="text-2xl font-bold text-green-600">{assembly.stats.destructiveTests.ok}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-red-600 font-medium mb-1">NG Fallados</p>
                                            <p className="text-2xl font-bold text-red-600">{assembly.stats.destructiveTests.ng}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-blue-600 font-medium mb-1">Tasa Éxito</p>
                                            <p className="text-2xl font-bold text-blue-600">{assembly.stats.destructiveTests.successRate}%</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                        );
                      })}

                      {/* Ensambles Terminados */}
                      {engineer.completedAssemblies.map((assembly) => {
                        const isExpanded = expandedAssemblies[assembly.id];
                        const hasStats = assembly.stats && assembly.stats.totalRecords > 0;
                        
                        return (
                          <>
                            <tr key={assembly.id} className="hover:bg-gray-50 bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm font-medium text-gray-700">{assembly.maquina} / {assembly.modelo}</div>
                              </div>
                              <div className="text-xs text-gray-500 font-medium mt-1">#{assembly.numero}</div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full opacity-75 ${
                                assembly.tipo === 'QC' 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                {assembly.tipo}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 w-20 bg-green-200 rounded-full h-2">
                                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                                <span className="text-sm font-bold text-green-700">100%</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border-2 border-green-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                Completado
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-600">
                                {assembly.fechaDeadline}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Finalizado ✓
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {hasStats ? (
                                  <button
                                    onClick={() => toggleAssemblyDetails(assembly.id)}
                                    className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs transition-all shadow-sm border border-gray-300"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                    {isExpanded ? 'Ocultar' : 'Ver Stats'}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Sin datos</span>
                                )}
                                <button
                                  onClick={() => navigate(`/admin/assembly/${assembly.id}`)}
                                  className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-all shadow-md"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Ver Detalles
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Fila expandible con estadísticas para completados */}
                          {isExpanded && hasStats && (
                            <tr className="bg-gradient-to-r from-green-50 to-emerald-50">
                              <td colSpan="6" className="px-5 py-6">
                                {assembly.tipo === 'QC' && assembly.stats.firstPercent && (
                                  <div className="space-y-4">
                                    <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 text-blue-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                      </svg>
                                      Estadísticas QC - {assembly.stats.totalRecords} Registros
                                    </h5>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      {/* Mejora Total */}
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-200">
                                        <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Mejora Total</p>
                                        <p className={`text-2xl font-bold ${
                                          assembly.stats.improvementPositive ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {assembly.stats.improvementPositive ? '+' : ''}{assembly.stats.improvement}%
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {assembly.stats.firstPercent}% → {assembly.stats.lastPercent}%
                                        </p>
                                      </div>

                                      {/* Promedio */}
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-200">
                                        <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Promedio</p>
                                        <p className="text-2xl font-bold text-blue-700">{assembly.stats.avgPercent}%</p>
                                        <p className="text-xs text-gray-500 mt-1">De todos los registros</p>
                                      </div>

                                      {/* Máximo */}
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-green-200">
                                        <p className="text-xs text-green-600 font-semibold uppercase mb-1">Máximo</p>
                                        <p className="text-2xl font-bold text-green-700">{assembly.stats.maxPercent}%</p>
                                        <p className="text-xs text-gray-500 mt-1">Mejor resultado</p>
                                      </div>

                                      {/* Meta alcanzada */}
                                      <div className={`rounded-lg p-4 shadow-sm border-2 ${
                                        assembly.stats.hasReachedGoal 
                                          ? 'bg-green-50 border-green-300' 
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <p className={`text-xs font-semibold uppercase mb-1 ${
                                          assembly.stats.hasReachedGoal ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                          Meta (≥97%)
                                        </p>
                                        <p className={`text-2xl font-bold ${
                                          assembly.stats.hasReachedGoal ? 'text-green-700' : 'text-yellow-700'
                                        }`}>
                                          {assembly.stats.hasReachedGoal ? '✓ SI' : '✗ NO'}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          Actual: {assembly.stats.lastPercent}%
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {assembly.tipo === 'TEACH' && (assembly.stats.jig1Stats || assembly.stats.jig2Stats || assembly.stats.destructiveTests) && (
                                  <div className="space-y-4">
                                    <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 text-green-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                                      </svg>
                                      Estadísticas TEACH - {assembly.stats.totalRecords} Registros
                                    </h5>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      {/* Jig 1 Stats */}
                                      {assembly.stats.jig1Stats && (
                                        <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-200">
                                          <h6 className="text-sm font-bold text-blue-700 mb-3 flex items-center">
                                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                                            Jig 1 - Mejora de Tiempo
                                          </h6>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Última Mejora</p>
                                              <p className={`text-xl font-bold ${
                                                parseFloat(assembly.stats.jig1Stats.lastImprovement) > 0 ? 'text-green-600' : 'text-red-600'
                                              }`}>
                                                {parseFloat(assembly.stats.jig1Stats.lastImprovement) > 0 ? '↑' : '↓'} {assembly.stats.jig1Stats.lastImprovement}%
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Promedio</p>
                                              <p className="text-xl font-bold text-blue-600">{assembly.stats.jig1Stats.avgImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Máxima</p>
                                              <p className="text-lg font-bold text-green-600">{assembly.stats.jig1Stats.maxImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Mínima</p>
                                              <p className="text-lg font-bold text-gray-600">{assembly.stats.jig1Stats.minImprovement}%</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Jig 2 Stats */}
                                      {assembly.stats.jig2Stats && (
                                        <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-purple-200">
                                          <h6 className="text-sm font-bold text-purple-700 mb-3 flex items-center">
                                            <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                                            Jig 2 - Mejora de Tiempo
                                          </h6>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Última Mejora</p>
                                              <p className={`text-xl font-bold ${
                                                parseFloat(assembly.stats.jig2Stats.lastImprovement) > 0 ? 'text-green-600' : 'text-red-600'
                                              }`}>
                                                {parseFloat(assembly.stats.jig2Stats.lastImprovement) > 0 ? '↑' : '↓'} {assembly.stats.jig2Stats.lastImprovement}%
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Promedio</p>
                                              <p className="text-xl font-bold text-purple-600">{assembly.stats.jig2Stats.avgImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Máxima</p>
                                              <p className="text-lg font-bold text-green-600">{assembly.stats.jig2Stats.maxImprovement}%</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 font-medium">Mínima</p>
                                              <p className="text-lg font-bold text-gray-600">{assembly.stats.jig2Stats.minImprovement}%</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Destructive Tests */}
                                    {assembly.stats.destructiveTests && assembly.stats.destructiveTests.total > 0 && (
                                      <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-200">
                                        <h6 className="text-sm font-bold text-gray-700 mb-3">Pruebas Destructivas</h6>
                                        <div className="grid grid-cols-4 gap-4">
                                          <div className="text-center">
                                            <p className="text-xs text-gray-500 font-medium mb-1">Total Pruebas</p>
                                            <p className="text-2xl font-bold text-gray-700">{assembly.stats.destructiveTests.total}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-green-600 font-medium mb-1">OK Pasados</p>
                                            <p className="text-2xl font-bold text-green-600">{assembly.stats.destructiveTests.ok}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-red-600 font-medium mb-1">NG Fallados</p>
                                            <p className="text-2xl font-bold text-red-600">{assembly.stats.destructiveTests.ng}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-blue-600 font-medium mb-1">Tasa Éxito</p>
                                            <p className="text-2xl font-bold text-blue-600">{assembly.stats.destructiveTests.successRate}%</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;
