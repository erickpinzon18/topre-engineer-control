import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const DailyChecklist = () => {
  const { currentUser, userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [daysWithChecklists, setDaysWithChecklists] = useState(new Set());
  const [editingItemId, setEditingItemId] = useState(null);
  const [editText, setEditText] = useState('');

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Formato de fecha para ID de documento
  const formatDateKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Cargar días con checklist para el mes actual
  const loadDaysWithChecklists = async () => {
    try {
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;

      const q = query(
        collection(db, 'dailyChecklists'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const snapshot = await getDocs(q);
      const days = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.items && data.items.length > 0) {
          days.add(data.date);
        }
      });
      setDaysWithChecklists(days);
    } catch (error) {
      console.error('Error cargando días con checklists:', error);
    }
  };

  // Cargar checklist para fecha seleccionada
  const loadChecklist = async () => {
    setLoading(true);
    try {
      const dateKey = formatDateKey(selectedDate);
      const docId = `${currentUser.uid}_${dateKey}`;
      const docRef = doc(db, 'dailyChecklists', docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setChecklistItems(data.items || []);
      } else {
        setChecklistItems([]);
      }
    } catch (error) {
      console.error('Error cargando checklist:', error);
      setChecklistItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Guardar checklist
  const saveChecklist = async (items) => {
    setSaving(true);
    try {
      const dateKey = formatDateKey(selectedDate);
      const docId = `${currentUser.uid}_${dateKey}`;
      const docRef = doc(db, 'dailyChecklists', docId);

      await setDoc(docRef, {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.email,
        date: dateKey,
        items: items,
        updatedAt: new Date()
      }, { merge: true });

      // Actualizar indicador de días con checklist
      if (items.length > 0) {
        setDaysWithChecklists(prev => new Set([...prev, dateKey]));
      } else {
        setDaysWithChecklists(prev => {
          const newSet = new Set(prev);
          newSet.delete(dateKey);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error guardando checklist:', error);
    } finally {
      setSaving(false);
    }
  };

  // Agregar nuevo item
  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    const newItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    const updatedItems = [...checklistItems, newItem];
    setChecklistItems(updatedItems);
    setNewItemText('');
    await saveChecklist(updatedItems);
  };

  // Toggle completado
  const handleToggleComplete = async (itemId) => {
    const updatedItems = checklistItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date().toISOString() : null
        };
      }
      return item;
    });

    setChecklistItems(updatedItems);
    await saveChecklist(updatedItems);
  };

  // Iniciar edición
  const handleStartEdit = (item) => {
    setEditingItemId(item.id);
    setEditText(item.text);
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editText.trim()) return;

    const updatedItems = checklistItems.map(item => {
      if (item.id === editingItemId) {
        return { ...item, text: editText.trim() };
      }
      return item;
    });

    setChecklistItems(updatedItems);
    setEditingItemId(null);
    setEditText('');
    await saveChecklist(updatedItems);
  };

  // Eliminar item
  const handleDeleteItem = async (itemId) => {
    const updatedItems = checklistItems.filter(item => item.id !== itemId);
    setChecklistItems(updatedItems);
    await saveChecklist(updatedItems);
  };

  // Navegación de mes
  const goToPreviousMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonthDate(today);
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

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  // Calcular progreso
  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    loadChecklist();
  }, [selectedDate]);

  useEffect(() => {
    loadDaysWithChecklists();
  }, [currentMonthDate]);

  const monthDays = generateMonthDays();

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />

      <main className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Checklist Diario</h1>
              <p className="text-sm text-gray-600">Organiza tus tareas del día</p>
            </div>
          </div>
          <button
            onClick={goToToday}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="hidden sm:inline">Hoy</span>
          </button>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Calendario Mensual */}
          <div className="lg:col-span-4">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              {/* Header del calendario */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <button onClick={goToPreviousMonth} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-bold text-white">
                    {monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                  </h3>
                  <button onClick={goToNextMonth} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Grid del calendario */}
              <div className="p-4">
                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map((day, idx) => (
                    <div key={idx} className="text-center text-xs font-bold text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((dayInfo, index) => {
                    const dateKey = formatDateKey(dayInfo.date);
                    const hasChecklist = daysWithChecklists.has(dateKey);
                    const isTodayDate = isToday(dayInfo.date);
                    const isSelectedDate = isSelected(dayInfo.date);

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(dayInfo.date)}
                        className={`
                          aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition
                          ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                          ${isSelectedDate ? 'bg-purple-600 text-white font-bold' : ''}
                          ${isTodayDate && !isSelectedDate ? 'bg-purple-100 text-purple-700 font-bold ring-2 ring-purple-300' : ''}
                          ${!isSelectedDate && !isTodayDate && dayInfo.isCurrentMonth ? 'hover:bg-gray-100' : ''}
                          ${hasChecklist && !isSelectedDate && !isTodayDate ? 'bg-green-50' : ''}
                        `}
                      >
                        <span>{dayInfo.day}</span>
                        {hasChecklist && (
                          <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelectedDate ? 'bg-white' : 'bg-green-500'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Leyenda */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Con tareas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                      <span>Seleccionado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editor de Checklist */}
          <div className="lg:col-span-8">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
                    </h3>
                    <p className="text-purple-200 text-sm">
                      {dayNames[selectedDate.getDay()]}
                      {isToday(selectedDate) && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">Hoy</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saving && (
                      <span className="text-purple-200 text-sm flex items-center gap-1">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Input para nueva tarea */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="Escribe una nueva tarea..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold py-2.5 px-4 rounded-lg transition flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="hidden sm:inline">Agregar</span>
                  </button>
                </div>
              </div>

              {/* Lista de tareas */}
              <div className="p-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando tareas...</p>
                  </div>
                ) : checklistItems.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg">No hay tareas para este día</p>
                    <p className="text-gray-400 text-sm mt-1">Agrega una tarea usando el campo de arriba</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {checklistItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                          item.completed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                            item.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-purple-500'
                          }`}
                        >
                          {item.completed && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          {editingItemId === item.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-700 p-1.5"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="text-gray-400 hover:text-gray-600 p-1.5"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                {item.text}
                              </span>
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="text-gray-400 hover:text-purple-600 p-1.5"
                                  title="Editar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-gray-400 hover:text-red-600 p-1.5"
                                  title="Eliminar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Barra de progreso */}
              {checklistItems.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progreso del día
                    </span>
                    <span className={`text-sm font-bold ${progressPercent === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                      {completedCount}/{totalCount} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        progressPercent === 100 ? 'bg-green-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  {progressPercent === 100 && (
                    <p className="text-center text-green-600 font-medium mt-2 text-sm">
                      🎉 ¡Completaste todas las tareas!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DailyChecklist;
