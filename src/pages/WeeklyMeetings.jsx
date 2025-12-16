import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const WeeklyMeetings = () => {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calcular el ID de la semana actual (formato: 2024-W51)
  const getCurrentWeekId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
  };

  // Obtener fecha de inicio de una semana dado su ID
  const getWeekDates = (weekId) => {
    const [year, week] = weekId.split('-W');
    const yearNum = parseInt(year);
    const weekNum = parseInt(week);
    
    // Primer día del año
    const firstDayOfYear = new Date(yearNum, 0, 1);
    // Encontrar el primer lunes del año
    const daysToMonday = (8 - firstDayOfYear.getDay()) % 7;
    const firstMonday = new Date(yearNum, 0, 1 + daysToMonday);
    
    // Calcular inicio de la semana solicitada
    const startDate = new Date(firstMonday);
    startDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    return { startDate, endDate };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    try {
      const weeksRef = collection(db, 'weeklyMeetings');
      const q = query(weeksRef, orderBy('year', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const weeksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar por año y semana (más reciente primero)
      weeksData.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      });
      
      setWeeks(weeksData);
    } catch (error) {
      console.error('Error cargando semanas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCurrentWeek = async () => {
    const weekId = getCurrentWeekId();
    const { startDate, endDate } = getWeekDates(weekId);
    const [year, week] = weekId.split('-W');
    
    // Crear el documento si no existe
    const weekRef = doc(db, 'weeklyMeetings', weekId);
    await setDoc(weekRef, {
      weekNumber: parseInt(week),
      year: parseInt(year),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      createdAt: new Date()
    }, { merge: true });
    
    navigate(`/meetings/${weekId}`);
  };

  const currentWeekId = getCurrentWeekId();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reuniones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Reuniones Semanales
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Seguimiento de actividades por semana
            </p>
          </div>
          <button
            onClick={handleGoToCurrentWeek}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg shadow-md transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Ir a Semana Actual
          </button>
        </div>

        {/* Current Week Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-5 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Semana Actual</p>
              <p className="text-2xl font-bold mt-1">{currentWeekId}</p>
              <p className="text-indigo-100 text-sm mt-1">
                {formatDate(getWeekDates(currentWeekId).startDate)} - {formatDate(getWeekDates(currentWeekId).endDate)}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Weeks List */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Historial de Reuniones</h2>
          </div>
          
          {weeks.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p className="text-gray-500 text-lg">No hay reuniones registradas</p>
              <p className="text-gray-400 text-sm mt-2">Haz clic en "Ir a Semana Actual" para comenzar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {weeks.map((week) => {
                const { startDate, endDate } = getWeekDates(week.id);
                const isCurrentWeek = week.id === currentWeekId;
                
                return (
                  <div
                    key={week.id}
                    onClick={() => navigate(`/meetings/${week.id}`)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between ${
                      isCurrentWeek ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                        isCurrentWeek 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {week.weekNumber}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Semana {week.weekNumber}
                          {isCurrentWeek && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                              Actual
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(startDate)} - {formatDate(endDate)}, {week.year}
                        </p>
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WeeklyMeetings;
