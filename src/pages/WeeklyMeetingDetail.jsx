import { useState, useEffect, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, getDoc, setDoc, collection, onSnapshot, updateDoc, writeBatch,
  query, orderBy, where, getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

// Componente de celda editable - FUERA del componente principal para evitar re-creación
const EditableCell = memo(({ 
  rowId, 
  cellName, 
  initialValue, 
  type = 'text', 
  options = null,
  lock,
  currentUserId,
  onUpdate,
  statusColors,
  areaColors
}) => {
  const [value, setValue] = useState(initialValue || '');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);
  
  // Verificar si está bloqueado por otro usuario
  const isLockedByOther = () => {
    if (!lock) return false;
    
    // Timeout de 30 segundos
    if (lock.lockedAt) {
      const lockTime = lock.lockedAt.toDate ? lock.lockedAt.toDate() : new Date(lock.lockedAt);
      const now = new Date();
      if (now - lockTime > 30000) return false;
    }
    
    return lock.userId !== currentUserId;
  };

  const isLocked = isLockedByOther();

  // Solo actualizar el valor local si NO estamos editando
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue || '');
    }
  }, [initialValue, isEditing]);

  const handleFocus = () => {
    if (isLocked) return;
    setIsEditing(true);
    onUpdate(rowId, cellName, value, 'lock');
  };

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(rowId, cellName, value, 'save');
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
    if (e.key === 'Escape') {
      setValue(initialValue || '');
      setIsEditing(false);
      onUpdate(rowId, cellName, initialValue || '', 'unlock');
    }
  };

  // Celda bloqueada por otro usuario
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

  // Selector
  if (type === 'select' && options) {
    return (
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onUpdate(rowId, cellName, e.target.value, 'save');
        }}
        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer ${
          cellName === 'status' ? (statusColors[value] || '') : 
          cellName === 'area' ? (areaColors[value] || '') : ''
        }`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  // Input de texto
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full px-2 py-1.5 text-sm border rounded transition-all min-h-[32px] ${
        isEditing 
          ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      placeholder="-"
    />
  );
});

const WeeklyMeetingDetail = () => {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [weekData, setWeekData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState([]);

  const DEFAULT_ROWS = 10;

  const statusOptions = [
    { value: '', label: '-' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'terminado', label: 'Terminado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  const areaOptions = [
    { value: '', label: '-' },
    { value: 'ASSY', label: 'ASSY' },
    { value: 'PRESS', label: 'PRESS' },
    { value: 'HOT-PRESS', label: 'HOT-PRESS' }
  ];

  const tipoOptions = [
    { value: '', label: '-' },
    { value: 'QC', label: 'QC' },
    { value: 'TEACH', label: 'TEACH' },
    { value: 'LASER', label: 'LASER' }
  ];

  const statusColors = {
    '': 'bg-white',
    'pendiente': 'bg-gray-200',
    'en_proceso': 'bg-yellow-200',
    'terminado': 'bg-green-200',
    'cancelado': 'bg-red-200'
  };

  const areaColors = {
    '': '',
    'ASSY': 'bg-sky-100',
    'PRESS': 'bg-orange-100',
    'HOT-PRESS': 'bg-red-100'
  };

  // Obtener fechas de la semana
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

  // Crear filas vacías iniciales
  const createEmptyRow = (index) => ({
    id: `row-${index}`,
    rowIndex: index,
    area: '',
    tipo: '',
    maquina: '',
    modelo: '',
    numero: '',
    status: '',
    comentarios: '',
    responsable: '',
    responsableUid: '',
    updatedAt: null,
    locks: {}
  });

  // Inicializar semana con filas vacías
  const initializeWeek = async () => {
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
        createdAt: new Date(),
        rowCount: DEFAULT_ROWS
      };
      await setDoc(weekRef, newWeekData);
      setWeekData(newWeekData);
      
      // Crear filas vacías
      const batch = writeBatch(db);
      for (let i = 0; i < DEFAULT_ROWS; i++) {
        const rowRef = doc(db, 'weeklyMeetings', weekId, 'rows', `row-${i}`);
        batch.set(rowRef, createEmptyRow(i));
      }
      await batch.commit();
    } else {
      setWeekData(weekSnap.data());
    }
    
    setLoading(false);
  };

  useEffect(() => {
    initializeWeek();
    loadEngineers();
  }, [weekId]);

  // Cargar lista de ingenieros
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

  // Listener en tiempo real para filas
  useEffect(() => {
    const rowsRef = collection(db, 'weeklyMeetings', weekId, 'rows');
    const q = query(rowsRef, orderBy('rowIndex', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rowsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (rowsData.length > 0) {
        setRows(rowsData);
      }
    }, (error) => {
      console.error('Error en listener:', error);
    });

    return () => unsubscribe();
  }, [weekId]);

  // Manejar actualización de celda
  const handleCellUpdate = async (rowId, cellName, value, action) => {
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'rows', rowId);
    
    if (action === 'lock') {
      await updateDoc(rowRef, {
        [`locks.${cellName}`]: {
          userId: currentUser.uid,
          userName: userProfile?.name || currentUser.email,
          lockedAt: new Date()
        }
      });
    } else if (action === 'unlock') {
      await updateDoc(rowRef, {
        [`locks.${cellName}`]: null
      });
    } else if (action === 'save') {
      await updateDoc(rowRef, {
        [cellName]: value,
        updatedAt: new Date(),
        [`locks.${cellName}`]: null
      });
    }
  };

  // Actualizar responsable
  const handleUpdateResponsable = async (rowId, value) => {
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'rows', rowId);
    await updateDoc(rowRef, {
      responsable: value,
      updatedAt: new Date()
    });
  };

  // Agregar nueva fila
  const addRow = async () => {
    const newIndex = rows.length;
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'rows', `row-${newIndex}`);
    await setDoc(rowRef, createEmptyRow(newIndex));
    
    const weekRef = doc(db, 'weeklyMeetings', weekId);
    await updateDoc(weekRef, { rowCount: newIndex + 1 });
  };

  // Limpiar fila
  const clearRow = async (rowId, rowIndex) => {
    const rowRef = doc(db, 'weeklyMeetings', weekId, 'rows', rowId);
    await setDoc(rowRef, createEmptyRow(rowIndex));
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

      <main className="max-w-full mx-auto py-4 px-4 sm:px-6">
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
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-5 mb-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Reunión Semanal</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">Semana {weekData?.weekNumber}</h1>
              <p className="text-indigo-100 mt-1">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm">En vivo</span>
              </div>
              <button
                onClick={addRow}
                className="bg-white text-indigo-600 font-bold py-2 px-4 rounded-lg shadow hover:bg-indigo-50 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Fila
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
          <strong>💡 Instrucciones:</strong> Haz clic en cualquier celda para editarla. Los cambios se guardan al salir de la celda. 
          Si ves un indicador rojo, alguien más está editando esa celda.
        </div>

        {/* Excel-like Table */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-10 border-r border-gray-200">#</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-28 border-r border-gray-200">Área</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-24 border-r border-gray-200">Tipo</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32 border-r border-gray-200">Máquina</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-28 border-r border-gray-200">Modelo</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32 border-r border-gray-200">Número</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32 border-r border-gray-200">Status</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-40 border-r border-gray-200">Responsable</th>
                  <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase min-w-[180px] border-r border-gray-200">Comentarios</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase w-16">🗑️</th>
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
                        rowId={row.id} 
                        cellName="area" 
                        initialValue={row.area}
                        type="select" 
                        options={areaOptions}
                        lock={row.locks?.area}
                        currentUserId={currentUser.uid}
                        onUpdate={handleCellUpdate}
                        statusColors={statusColors}
                        areaColors={areaColors}
                      />
                    </td>
                    
                    <td className="px-1 py-1 border-r border-gray-200">
                      <EditableCell 
                        rowId={row.id} 
                        cellName="tipo" 
                        initialValue={row.tipo}
                        type="select" 
                        options={tipoOptions}
                        lock={row.locks?.tipo}
                        currentUserId={currentUser.uid}
                        onUpdate={handleCellUpdate}
                        statusColors={statusColors}
                        areaColors={areaColors}
                      />
                    </td>
                    
                    <td className="px-1 py-1 border-r border-gray-200">
                      <EditableCell 
                        rowId={row.id} 
                        cellName="maquina" 
                        initialValue={row.maquina}
                        lock={row.locks?.maquina}
                        currentUserId={currentUser.uid}
                        onUpdate={handleCellUpdate}
                        statusColors={statusColors}
                        areaColors={areaColors}
                      />
                    </td>
                    
                    <td className="px-1 py-1 border-r border-gray-200">
                      <EditableCell 
                        rowId={row.id} 
                        cellName="modelo" 
                        initialValue={row.modelo}
                        lock={row.locks?.modelo}
                        currentUserId={currentUser.uid}
                        onUpdate={handleCellUpdate}
                        statusColors={statusColors}
                        areaColors={areaColors}
                      />
                    </td>
                    
                    <td className="px-1 py-1 border-r border-gray-200">
                      <EditableCell 
                        rowId={row.id} 
                        cellName="numero" 
                        initialValue={row.numero}
                        lock={row.locks?.numero}
                        currentUserId={currentUser.uid}
                        onUpdate={handleCellUpdate}
                        statusColors={statusColors}
                        areaColors={areaColors}
                      />
                    </td>
                    
                    <td className="px-1 py-1 border-r border-gray-200">
                      <EditableCell 
                        rowId={row.id} 
                        cellName="status" 
                        initialValue={row.status}
                        type="select" 
                        options={statusOptions}
                        lock={row.locks?.status}
                        currentUserId={currentUser.uid}
                        onUpdate={handleCellUpdate}
                        statusColors={statusColors}
                        areaColors={areaColors}
                      />
                    </td>
                    
                    <td className="px-1 py-1 border-r border-gray-200">
                      <select
                        value={row.responsable || ''}
                        onChange={(e) => handleUpdateResponsable(row.id, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-</option>
                        {engineers.map(eng => (
                          <option key={eng.id} value={eng.name}>{eng.name}</option>
                        ))}
                      </select>
                    </td>
                    
                    <td className="px-1 py-1 border-r border-gray-200">
                      <EditableCell 
                        rowId={row.id} 
                        cellName="comentarios" 
                        initialValue={row.comentarios}
                        lock={row.locks?.comentarios}
                        currentUserId={currentUser.uid}
                        onUpdate={handleCellUpdate}
                        statusColors={statusColors}
                        areaColors={areaColors}
                      />
                    </td>
                    
                    <td className="px-1 py-1 text-center">
                      <button
                        onClick={() => clearRow(row.id, row.rowIndex)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
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
              onClick={addRow}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar fila
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
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
