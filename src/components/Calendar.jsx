import { useState } from 'react';

const Calendar = ({ assemblies = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Obtener todos los eventos (fechas de préstamo)
  const events = assemblies
    .filter(a => a.fechaPrestamo)
    .map(a => ({
      date: a.fechaPrestamo,
      maquina: a.maquina,
      modelo: a.modelo,
      tipo: a.tipo,
      id: a.id
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Obtener eventos del mes actual
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  // Próximas 5 fechas
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .slice(0, 5);

  // Navegación de mes
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generar días del calendario
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Días del siguiente mes para completar la cuadrícula
    const remainingDays = 42 - days.length; // 6 semanas x 7 días
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header del Calendario */}
      <div className="bg-linear-to-r from-sky-600 to-blue-600 p-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Fechas de Préstamo
        </h3>
      </div>

      {/* Navegación del mes */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <div className="text-center">
          <h4 className="text-sm font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h4>
          <button
            onClick={goToToday}
            className="text-xs text-sky-600 hover:text-sky-800 font-medium"
          >
            Hoy
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendario */}
      <div className="p-3">
        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayInfo, index) => {
            const dayEvents = getEventsForDate(dayInfo.date);
            const hasEvents = dayEvents.length > 0;
            const isTodayDate = isToday(dayInfo.date);

            return (
              <div
                key={index}
                className={`
                  relative aspect-square flex flex-col items-center justify-center text-xs rounded-lg
                  ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-800'}
                  ${isTodayDate ? 'bg-sky-100 border-2 border-sky-500 font-bold' : 'hover:bg-gray-50'}
                  ${hasEvents ? 'bg-blue-50' : ''}
                `}
                title={hasEvents ? dayEvents.map(e => `${e.maquina} / ${e.modelo}`).join('\n') : ''}
              >
                <span className={isTodayDate ? 'text-sky-700' : ''}>{dayInfo.day}</span>
                {hasEvents && (
                  <div className="absolute bottom-0.5 flex space-x-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          event.tipo === 'QC' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Próximas fechas */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Próximas Revisiones
        </h4>
        
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-2">No hay fechas programadas</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {upcomingEvents.map((event, index) => {
              const eventDate = new Date(event.date);
              const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
              
              return (
                <div
                  key={index}
                  className="bg-white p-2.5 rounded-lg border border-gray-200 hover:border-sky-300 hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      event.tipo === 'QC' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {event.tipo}
                    </span>
                    {daysUntil === 0 && <span className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 font-bold rounded">Hoy</span>}
                    {daysUntil === 1 && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">Mañana</span>}
                    {daysUntil > 1 && daysUntil <= 7 && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded">{daysUntil}d</span>}
                    {daysUntil > 7 && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 font-medium rounded">{daysUntil}d</span>}
                  </div>
                  <p className="text-xs font-semibold text-gray-900 mb-0.5">
                    {event.maquina}
                  </p>
                  <p className="text-xs text-gray-600">
                    {event.modelo}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5 font-medium">
                    📅 {eventDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
