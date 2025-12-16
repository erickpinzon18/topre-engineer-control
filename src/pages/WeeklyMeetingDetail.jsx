import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, getDoc, setDoc, collection, onSnapshot, updateDoc, writeBatch,
  query, orderBy, where, getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

// ============ COMPONENTE EDITABLE CELL - FUERA DEL COMPONENTE PRINCIPAL ============
const EditableCell = memo(({ 
  rowId, 
  cellName, 
  initialValue, 
  type = 'text', 
  options = null,
  lock,
  currentUserId,
  onUpdate,
  statusColors = {},
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(initialValue || '');
  const isEditingRef = useRef(false);
  const inputRef = useRef(null);
  
  const isLockedByOther = () => {
    if (!lock) return false;
    if (lock.lockedAt) {
      const lockTime = lock.lockedAt.toDate ? lock.lockedAt.toDate() : new Date(lock.lockedAt);
      const now = new Date();
      if (now - lockTime > 30000) return false;
    }
    return lock.userId !== currentUserId;
  };

  const isLocked = isLockedByOther();

  // Solo actualizar valor local si NO estamos editando
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocalValue(initialValue || '');
    }
  }, [initialValue]);

  const handleFocus = () => {
    if (isLocked) return;
    isEditingRef.current = true;
    onUpdate(rowId, cellName, localValue, 'lock');
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    onUpdate(rowId, cellName, localValue, 'save');
  };

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(initialValue || '');
      isEditingRef.current = false;
      onUpdate(rowId, cellName, initialValue || '', 'unlock');
    }
  };

  if (isLocked) {
    return (
      <div className="relative">
        <div className="px-2 py-1.5 text-sm bg-red-50 border border-red-300 rounded cursor-not-allowed min-h-[32px]">
          {initialValue || '-'}
        </div>
        <div className="absolute -top-5 left-0 text-xs bg-red-500 text-white px-1 rounded whitespace-nowrap z-10">
          ✏️ {lock?.userName || 'Alguien'}
        </div>
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <select
        value={localValue}
        onChange={(e) => {
          const newVal = e.target.value;
          setLocalValue(newVal);
          onUpdate(rowId, cellName, newVal, 'save');
        }}
        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer ${statusColors[localValue] || ''} ${className}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full px-2 py-1.5 text-sm border rounded transition-all min-h-[32px] ${
        isEditingRef.current 
          ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50' 
          : 'border-gray-300 hover:border-gray-400'
      } ${className}`}
      placeholder="-"
    />
  );
});

// ============ COMPONENTE MEETING TABLE - FUERA DEL COMPONENTE PRINCIPAL ============
const MeetingTable = memo(({ 
  title, 
  rows, 
  area, 
  tipoOptions, 
  bgColor, 
  borderColor,
  statusOptions,
  statusColors,
  engineers,
  currentUserId,
  onCellUpdate,
  onUpdateResponsable,
  onClearRow,
  onAddRow
}) => (
  <div className={`bg-white shadow-lg rounded-xl overflow-hidden border-t-4 ${borderColor} mb-6`}>
    <div className={`px-4 py-3 ${bgColor} border-b border-gray-200`}>
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase w-8 border-r border-gray-200">#</th>
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase w-20 border-r border-gray-200">Tipo</th>
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase w-28 border-r border-gray-200">Máquina</th>
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase w-24 border-r border-gray-200">Modelo</th>
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase w-24 border-r border-gray-200">Número</th>
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase w-28 border-r border-gray-200">Status</th>
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase w-32 border-r border-gray-200">Responsable</th>
            <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase min-w-[140px] border-r border-gray-200">Comentarios</th>
            <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase w-10">🗑️</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-2 py-1 text-center text-xs text-gray-500 font-mono bg-gray-50 border-r border-gray-200">
                {index + 1}
              </td>
              <td className="px-1 py-1 border-r border-gray-200">
                <EditableCell 
                  rowId={row.id} cellName="tipo" initialValue={row.tipo}
                  type="select" options={tipoOptions}
                  lock={row.locks?.tipo} currentUserId={currentUserId}
                  onUpdate={onCellUpdate}
                />
              </td>
              <td className="px-1 py-1 border-r border-gray-200">
                <EditableCell 
                  rowId={row.id} cellName="maquina" initialValue={row.maquina}
                  lock={row.locks?.maquina} currentUserId={currentUserId}
                  onUpdate={onCellUpdate}
                />
              </td>
              <td className="px-1 py-1 border-r border-gray-200">
                <EditableCell 
                  rowId={row.id} cellName="modelo" initialValue={row.modelo}
                  lock={row.locks?.modelo} currentUserId={currentUserId}
                  onUpdate={onCellUpdate}
                />
              </td>
              <td className="px-1 py-1 border-r border-gray-200">
                <EditableCell 
                  rowId={row.id} cellName="numero" initialValue={row.numero}
                  lock={row.locks?.numero} currentUserId={currentUserId}
                  onUpdate={onCellUpdate}
                />
              </td>
              <td className="px-1 py-1 border-r border-gray-200">
                <EditableCell 
                  rowId={row.id} cellName="status" initialValue={row.status}
                  type="select" options={statusOptions}
                  lock={row.locks?.status} currentUserId={currentUserId}
                  onUpdate={onCellUpdate} statusColors={statusColors}
                />
              </td>
              <td className="px-1 py-1 border-r border-gray-200">
                <select
                  value={row.responsable || ''}
                  onChange={(e) => onUpdateResponsable(row.id, e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.name}>{eng.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-1 py-1 border-r border-gray-200">
                <EditableCell 
                  rowId={row.id} cellName="comentarios" initialValue={row.comentarios}
                  lock={row.locks?.comentarios} currentUserId={currentUserId}
                  onUpdate={onCellUpdate}
                />
              </td>
              <td className="px-1 py-1 text-center">
                <button
                  onClick={() => onClearRow(row.id, row.rowIndex, area)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                  title="Limpiar fila"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="p-3 bg-gray-50 border-t border-gray-200">
      <button
        onClick={() => onAddRow(area)}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Agregar fila
      </button>
    </div>
  </div>
));

// ============ COMPONENTE PRINCIPAL ============
const WeeklyMeetingDetail = () => {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [weekData, setWeekData] = useState(null);
  const [activeDay, setActiveDay] = useState('lunes');
  const [assyRows, setAssyRows] = useState([]);
  const [pressRows, setPressRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState([]);

  const DEFAULT_ROWS = 5;

  const days = [
    { id: 'lunes', label: 'Lunes', short: 'Lun' },
    { id: 'martes', label: 'Martes', short: 'Mar' },
    { id: 'miercoles', label: 'Miércoles', short: 'Mié' },
    { id: 'jueves', label: 'Jueves', short: 'Jue' },
    { id: 'viernes', label: 'Viernes', short: 'Vie' },
    { id: 'sabado', label: 'Sábado', short: 'Sáb' }
  ];

  const statusOptions = [
    { value: '', label: '-' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'terminado', label: 'Terminado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  const tipoOptionsAssy = [
    { value: '', label: '-' },
    { value: 'QC', label: 'QC' },
    { value: 'TEACH', label: 'TEACH' }
  ];

  const tipoOptionsPress = [
    { value: '', label: '-' },
    { value: 'QC', label: 'QC' },
    { value: 'LASER', label: 'LASER' }
  ];

  const statusColors = {
    '': 'bg-white',
    'pendiente': 'bg-gray-200',
    'en_proceso': 'bg-yellow-200',
    'terminado': 'bg-green-200',
    'cancelado': 'bg-red-200'
  };

  const getWeekDates = (weekId) => {
    const [year, week] = weekId.split('-W');
    const yearNum = parseInt(year);
    const weekNum = parseInt(week);
    
    const jan4 = new Date(yearNum, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
    
    const startDate = new Date(mondayWeek1);
    startDate.setDate(mondayWeek1.getDate() + (weekNum - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return { startDate, endDate };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const createEmptyRow = useCallback((index, area, day) => ({
    id: `${day}-${area.toLowerCase()}-row-${index}`,
    rowIndex: index,
    area: area,
    day: day,
    tipo: '',
    maquina: '',
    modelo: '',
    numero: '',
    status: '',
    comentarios: '',
    responsable: '',
    updatedAt: null,
    locks: {}
  }), []);

  const initializeWeek = useCallback(async () => {
    const weekRef = doc(db, 'weeklyMeetings', weekId);
    const weekSnap = await getDoc(weekRef);
    const { startDate, endDate } = getWeekDates(weekId);
    const [year, week] = weekId.split('-W');
    
    if (!weekSnap.exists()) {
      const newWeekData = {
        weekNumber: parseInt(week),
        year: parseInt(year),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        createdAt: new Date()
      };
      await setDoc(weekRef, newWeekData);
      setWeekData(newWeekData);
      
      const batch = writeBatch(db);
      for (const day of days) {
        for (let i = 0; i < DEFAULT_ROWS; i++) {
          const assyRef = doc(db, 'weeklyMeetings', weekId, 'days', day.id, 'rows', `${day.id}-assy-row-${i}`);
          batch.set(assyRef, createEmptyRow(i, 'ASSY', day.id));
          const pressRef = doc(db, 'weeklyMeetings', weekId, 'days', day.id, 'rows', `${day.id}-press-row-${i}`);
          batch.set(pressRef, createEmptyRow(i, 'PRESS', day.id));
        }
      }
      await batch.commit();
    } else {
      setWeekData(weekSnap.data());
    }
    setLoading(false);
  }, [weekId, createEmptyRow]);

  useEffect(() => {
    initializeWeek();
    loadEngineers();
  }, [weekId, initializeWeek]);

  const loadEngineers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('type', '==', 'ing'));
      const querySnapshot = await getDocs(q);
      const engineersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().email
      }));
      setEngineers(engineersList);
    } catch (error) {
      console.error('Error cargando ingenieros:', error);
    }
  };

  useEffect(() => {
    if (!weekId || !activeDay) return;

    const rowsRef = collection(db, 'weeklyMeetings', weekId, 'days', activeDay, 'rows');
    const q = query(rowsRef, orderBy('rowIndex', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const assy = allRows.filter(r => r.area === 'ASSY' || r.id.includes('-assy-'));
      const press = allRows.filter(r => r.area === 'PRESS' || r.area === 'HOT-PRESS' || r.id.includes('-press-'));
      setAssyRows(assy);
      setPressRows(press);
    }, (error) => {
      console.error('Error en listener:', error);
    });
    
    return () => unsubscribe();
  }, [weekId, activeDay]);

  const handleCellUpdate = useCallback(async (rowId, cellName, value, action) => {
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'days', activeDay, 'rows', rowId);
    try {
      if (action === 'lock') {
        await updateDoc(rowRef, {
          [`locks.${cellName}`]: {
            userId: currentUser.uid,
            userName: userProfile?.name || currentUser.email,
            lockedAt: new Date()
          }
        });
      } else if (action === 'unlock') {
        await updateDoc(rowRef, { [`locks.${cellName}`]: null });
      } else if (action === 'save') {
        await updateDoc(rowRef, {
          [cellName]: value,
          updatedAt: new Date(),
          [`locks.${cellName}`]: null
        });
      }
    } catch (error) {
      console.error('Error updating cell:', error);
    }
  }, [weekId, activeDay, currentUser, userProfile]);

  const handleUpdateResponsable = useCallback(async (rowId, value) => {
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'days', activeDay, 'rows', rowId);
    await updateDoc(rowRef, { responsable: value, updatedAt: new Date() });
  }, [weekId, activeDay]);

  const addRow = useCallback(async (area) => {
    const rows = area === 'ASSY' ? assyRows : pressRows;
    const prefix = area === 'ASSY' ? 'assy' : 'press';
    const newIndex = rows.length;
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'days', activeDay, 'rows', `${activeDay}-${prefix}-row-${newIndex}`);
    await setDoc(rowRef, createEmptyRow(newIndex, area, activeDay));
  }, [weekId, activeDay, assyRows, pressRows, createEmptyRow]);

  const clearRow = useCallback(async (rowId, rowIndex, area) => {
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'days', activeDay, 'rows', rowId);
    await setDoc(rowRef, createEmptyRow(rowIndex, area, activeDay));
  }, [weekId, activeDay, createEmptyRow]);

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

      <main className="max-w-full mx-auto py-4 px-4 sm:px-6">
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

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-5 mb-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Reunión Semanal</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">Semana {weekData?.weekNumber}</h1>
              <p className="text-indigo-100 mt-1">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm">En vivo</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-4 overflow-hidden">
          <div className="flex overflow-x-auto">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id)}
                className={`flex-1 min-w-[100px] px-4 py-3 text-center font-semibold transition-all border-b-4 ${
                  activeDay === day.id
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-transparent'
                }`}
              >
                <span className="hidden sm:inline">{day.label}</span>
                <span className="sm:hidden">{day.short}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-indigo-100 border border-indigo-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="font-bold text-indigo-800">
              {days.find(d => d.id === activeDay)?.label}
            </span>
          </div>
          <span className="text-sm text-indigo-600">
            Semana {weekData?.weekNumber} • {weekData?.year}
          </span>
        </div>

        <MeetingTable 
          title="📦 Ensambles (ASSY)"
          rows={assyRows}
          area="ASSY"
          tipoOptions={tipoOptionsAssy}
          bgColor="bg-sky-50"
          borderColor="border-sky-500"
          statusOptions={statusOptions}
          statusColors={statusColors}
          engineers={engineers}
          currentUserId={currentUser.uid}
          onCellUpdate={handleCellUpdate}
          onUpdateResponsable={handleUpdateResponsable}
          onClearRow={clearRow}
          onAddRow={addRow}
        />

        <MeetingTable 
          title="⚙️ Prensas (PRESS / HOT-PRESS)"
          rows={pressRows}
          area="PRESS"
          tipoOptions={tipoOptionsPress}
          bgColor="bg-orange-50"
          borderColor="border-orange-500"
          statusOptions={statusOptions}
          statusColors={statusColors}
          engineers={engineers}
          currentUserId={currentUser.uid}
          onCellUpdate={handleCellUpdate}
          onUpdateResponsable={handleUpdateResponsable}
          onClearRow={clearRow}
          onAddRow={addRow}
        />

        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span>Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200 rounded"></div>
            <span>En Proceso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 rounded"></div>
            <span>Terminado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 rounded"></div>
            <span>Cancelado</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WeeklyMeetingDetail;
