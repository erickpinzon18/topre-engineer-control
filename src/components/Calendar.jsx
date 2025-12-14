import { useState } from 'react';

const Calendar = ({ assemblies = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

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

  // Obtener eventos para una fecha específica
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  // Navegación de 3 días
  const goToPreviousDays = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 3);
    setCurrentDate(newDate);
  };

  const goToNextDays = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 3);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setCurrentMonthDate(now);
  };

  // Navegación de mes (para la vista mensual)
  const goToPreviousMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  // Generar 3 días a partir de la fecha actual
  const generateDays = () => {
    const days = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Generar días del mes
  const generateMonthDays = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
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
    
    // Días del siguiente mes
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const displayDays = generateDays();
  const monthDays = generateMonthDays();
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // Formato de rango de fechas para el header
  const startDay = displayDays[0];
  const endDay = displayDays[2];
  const headerText = `${startDay.getDate()} - ${endDay.getDate()} ${monthNames[endDay.getMonth()]} ${endDay.getFullYear()}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
      {/* Header del Calendario */}
      <div className="bg-linear-to-r from-sky-600 to-blue-600 p-3">
        <h3 className="text-base font-bold text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Calendario de Revisiones
        </h3>
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        <button
          onClick={goToPreviousDays}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <div className="text-center">
          <h4 className="text-xs font-bold text-gray-900">
            {headerText}
          </h4>
          <button
            onClick={goToToday}
            className="text-[10px] text-sky-600 hover:text-sky-800 font-medium"
          >
            Hoy
          </button>
        </div>
        
        <button
          onClick={goToNextDays}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendario de 3 días */}
      <div className="grid grid-cols-3 gap-1 p-2">
        {displayDays.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const isTodayDate = isToday(date);

          return (
            <div
              key={index}
              className={`rounded-lg border ${isTodayDate ? 'bg-sky-50 border-sky-200' : 'bg-gray-50 border-gray-100'}`}
            >
              {/* Header del día */}
              <div className={`text-center py-1.5 border-b ${isTodayDate ? 'border-sky-200' : 'border-gray-200'}`}>
                <div className={`text-[10px] font-bold ${isTodayDate ? 'text-sky-700' : 'text-gray-500'}`}>
                  {dayNames[date.getDay()]}
                </div>
                <div className={`text-sm font-bold ${isTodayDate ? 'text-sky-700' : 'text-gray-700'}`}>
                  {date.getDate()}
                </div>
              </div>
              
              {/* Eventos del día */}
              <div className="p-1.5 space-y-1 min-h-[80px]">
                {dayEvents.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center italic">Sin revisiones</p>
                ) : (
                  dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={`p-1.5 rounded border text-[10px] ${
                        event.tipo === 'QC' 
                          ? 'bg-blue-100 border-blue-200 text-blue-800' 
                          : 'bg-green-100 border-green-200 text-green-800'
                      }`}
                    >
                      <div className="font-bold truncate">{event.maquina}</div>
                      <div className="text-gray-600 truncate">{event.modelo}</div>
                    </div>
                  ))
                )}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 text-center">+{dayEvents.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista Mensual Compacta */}
      <div className="border-t border-gray-200">
        <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Mes
          </h4>
          <div className="flex items-center space-x-1">
             <button onClick={goToPreviousMonth} className="p-0.5 hover:bg-gray-200 rounded">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-gray-600">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
               </svg>
             </button>
             <span className="text-[10px] font-bold text-gray-900 w-20 text-center">
               {monthNames[currentMonthDate.getMonth()].substring(0, 3)} {currentMonthDate.getFullYear()}
             </span>
             <button onClick={goToNextMonth} className="p-0.5 hover:bg-gray-200 rounded">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-gray-600">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
               </svg>
             </button>
          </div>
        </div>

        {/* Grid Mensual Compacto */}
        <div className="p-2 bg-gray-50">
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-[8px] font-bold text-gray-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {monthDays.map((dayInfo, index) => {
              const dayEvents = getEventsForDate(dayInfo.date);
              const hasEvents = dayEvents.length > 0;
              const isTodayDate = isToday(dayInfo.date);
              
              // Check if this day is one of the 3 currently viewed days
              const isViewedDay = displayDays.some(d => {
                const viewDate = new Date(d);
                viewDate.setHours(0, 0, 0, 0);
                const checkDate = new Date(dayInfo.date);
                checkDate.setHours(0, 0, 0, 0);
                return viewDate.getTime() === checkDate.getTime();
              });

              return (
                <div
                  key={index}
                  className={`
                    aspect-square flex flex-col items-center justify-center text-[9px] rounded
                    ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-600'}
                    ${isTodayDate ? 'bg-sky-200 font-bold text-sky-700' : ''}
                    ${isViewedDay && !isTodayDate ? 'bg-orange-50 ring-2 ring-orange-300 font-bold text-orange-600' : ''}
                    ${!isViewedDay && !isTodayDate ? 'bg-white' : ''}
                    ${hasEvents && !isTodayDate && !isViewedDay ? 'ring-1 ring-blue-200 bg-blue-50' : ''}
                  `}
                  title={hasEvents ? dayEvents.map(e => `${e.maquina} / ${e.modelo}`).join('\n') : ''}
                >
                  <span>{dayInfo.day}</span>
                  {hasEvents && (
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
