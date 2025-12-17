import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, getDoc, setDoc, collection, onSnapshot, updateDoc, writeBatch,
  query, orderBy, where, getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  // Función para generar PDF semanal
  const generateWeeklyPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const allDaysData = {};
      const { startDate, endDate } = getWeekDates(weekId);
      
      // Cargar datos de todos los días
      for (const day of days) {
        const rowsRef = collection(db, 'weeklyMeetings', weekId, 'days', day.id, 'rows');
        const q = query(rowsRef, orderBy('rowIndex', 'asc'));
        const snapshot = await getDocs(q);
        const allRows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        allDaysData[day.id] = {
          assy: allRows.filter(r => r.area === 'ASSY' || r.id.includes('-assy-')).filter(r => r.maquina || r.modelo || r.numero),
          press: allRows.filter(r => r.area === 'PRESS' || r.area === 'HOT-PRESS' || r.id.includes('-press-')).filter(r => r.maquina || r.modelo || r.numero)
        };
      }

      const statusLabels = {
        '': '-',
        'pendiente': 'Pendiente',
        'en_proceso': 'En Proceso',
        'terminado': 'Terminado',
        'cancelado': 'Cancelado'
      };

      const statusTextColors = {
        '': '#6b7280',
        'pendiente': '#6b7280',
        'en_proceso': '#d97706',
        'terminado': '#16a34a',
        'cancelado': '#dc2626'
      };

      const tipoTextColors = {
        'QC': '#2563eb',
        'TEACH': '#16a34a',
        'LASER': '#9333ea'
      };

      // Generar HTML del reporte
      let html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 100%; background: white;">
          <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 25px; border-radius: 12px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800;">📋 Reporte Semanal</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Semana ${weekData?.weekNumber} • ${weekData?.year}</p>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">${formatDate(startDate)} - ${formatDate(endDate)}</p>
          </div>
      `;

      // Iterar por cada día
      let isFirstDay = true;
      for (const day of days) {
        const dayData = allDaysData[day.id];
        const hasData = (dayData.assy.length > 0 || dayData.press.length > 0);
        
        if (!hasData) continue;

        // Cada día en una nueva página (excepto el primero)
        const pageBreak = isFirstDay ? '' : 'page-break-before: always;';
        isFirstDay = false;

        html += `
          <div style="margin-bottom: 30px; ${pageBreak}">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 18px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 700;">📅 ${day.label}</h2>
            </div>
        `;

        // Tabla ASSY
        if (dayData.assy.length > 0) {
          html += `
            <div style="margin-bottom: 15px; page-break-inside: avoid;">
              <div style="background: #e0f2fe; padding: 10px 15px; border-left: 4px solid #0ea5e9;">
                <h3 style="margin: 0; font-size: 14px; color: #0369a1; font-weight: 700;">📦 Ensambles (ASSY) - ${dayData.assy.length} registros</h3>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
                <thead>
                  <tr style="background: #f1f5f9;">
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 8%;">Tipo</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 16%;">Máquina</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Modelo</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Número</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Status</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Responsable</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 24%;">Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  ${dayData.assy.map((row, idx) => `
                    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${tipoTextColors[row.tipo] || '#374151'}; font-weight: 700;">${row.tipo || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: 600;">${row.maquina || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${row.modelo || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-family: monospace;">${row.numero || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${statusTextColors[row.status || '']}; font-weight: 600;">${statusLabels[row.status] || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px;">${row.responsable || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">${row.comentarios || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // Tabla PRESS
        if (dayData.press.length > 0) {
          html += `
            <div style="margin-bottom: 15px; page-break-inside: avoid;">
              <div style="background: #ffedd5; padding: 10px 15px; border-left: 4px solid #f97316;">
                <h3 style="margin: 0; font-size: 14px; color: #c2410c; font-weight: 700;">⚙️ Prensas (PRESS) - ${dayData.press.length} registros</h3>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
                <thead>
                  <tr style="background: #fff7ed;">
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 8%;">Tipo</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 16%;">Máquina</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Modelo</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Número</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Status</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Responsable</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 24%;">Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  ${dayData.press.map((row, idx) => `
                    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fffbeb'};">
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${tipoTextColors[row.tipo] || '#374151'}; font-weight: 700;">${row.tipo || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: 600;">${row.maquina || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${row.modelo || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-family: monospace;">${row.numero || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${statusTextColors[row.status || '']}; font-weight: 600;">${statusLabels[row.status] || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px;">${row.responsable || '-'}</td>
                      <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">${row.comentarios || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        html += `</div>`;
      }

      // Resumen de la semana
      let totalAssy = 0, totalPress = 0, terminados = 0, enProceso = 0, pendientes = 0;
      for (const day of days) {
        const dayData = allDaysData[day.id];
        totalAssy += dayData.assy.length;
        totalPress += dayData.press.length;
        [...dayData.assy, ...dayData.press].forEach(r => {
          if (r.status === 'terminado') terminados++;
          else if (r.status === 'en_proceso') enProceso++;
          else if (r.status === 'pendiente') pendientes++;
        });
      }

      html += `
        <div style="margin-top: 30px; background: #f8fafc; border-radius: 12px; padding: 20px; border: 2px solid #e2e8f0;">
          <h3 style="margin: 0 0 15px; font-size: 16px; color: #1e293b; font-weight: 700;">📊 Resumen de la Semana</h3>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #0ea5e9;">${totalAssy}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Ensambles</p>
            </div>
            <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #f97316;">${totalPress}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Prensas</p>
            </div>
            <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #22c55e;">${terminados}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Terminados</p>
            </div>
            <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #eab308;">${enProceso}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">En Proceso</p>
            </div>
            <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #6b7280;">${pendientes}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Pendientes</p>
            </div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 25px; color: #9ca3af; font-size: 10px;">
          Generado el ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      `;

      // Crear PDF con secciones separadas
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      let currentY = margin;

      // Función auxiliar para renderizar una sección y agregarla al PDF
      const addSectionToPDF = async (sectionHtml, isFirst = false) => {
        const container = document.createElement('div');
        container.innerHTML = `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 15px; background: white;">${sectionHtml}</div>`;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '794px';
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        document.body.removeChild(container);

        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Si no cabe en la página actual, agregar nueva página
        if (!isFirst && currentY + imgHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;
      };

      // Header
      const headerHtml = `
        <div style="text-align: center; margin-bottom: 20px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 25px; border-radius: 12px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800;">📋 Reporte Semanal</h1>
          <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Semana ${weekData?.weekNumber} • ${weekData?.year}</p>
          <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">${formatDate(startDate)} - ${formatDate(endDate)}</p>
        </div>
      `;
      await addSectionToPDF(headerHtml, true);

      // Cada día como sección separada
      for (const day of days) {
        const dayData = allDaysData[day.id];
        const hasData = (dayData.assy.length > 0 || dayData.press.length > 0);
        if (!hasData) continue;

        let dayHtml = `
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 18px; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 700;">📅 ${day.label}</h2>
          </div>
        `;

        // ASSY
        if (dayData.assy.length > 0) {
          dayHtml += `
            <div style="background: #e0f2fe; padding: 10px 15px; border-left: 4px solid #0ea5e9;">
              <h3 style="margin: 0; font-size: 14px; color: #0369a1; font-weight: 700;">📦 Ensambles (ASSY) - ${dayData.assy.length} registros</h3>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 8%;">Tipo</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 16%;">Máquina</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Modelo</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Número</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Status</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Responsable</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 24%;">Comentarios</th>
                </tr>
              </thead>
              <tbody>
                ${dayData.assy.map((row, idx) => `
                  <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${tipoTextColors[row.tipo] || '#374151'}; font-weight: 700;">${row.tipo || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: 600;">${row.maquina || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${row.modelo || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-family: monospace;">${row.numero || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${statusTextColors[row.status || '']}; font-weight: 600;">${statusLabels[row.status] || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px;">${row.responsable || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">${row.comentarios || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }

        // PRESS
        if (dayData.press.length > 0) {
          dayHtml += `
            <div style="background: #ffedd5; padding: 10px 15px; border-left: 4px solid #f97316; margin-top: 10px;">
              <h3 style="margin: 0; font-size: 14px; color: #c2410c; font-weight: 700;">⚙️ Prensas (PRESS) - ${dayData.press.length} registros</h3>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: #fff7ed;">
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 8%;">Tipo</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 16%;">Máquina</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Modelo</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Número</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 12%;">Status</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 14%;">Responsable</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; width: 24%;">Comentarios</th>
                </tr>
              </thead>
              <tbody>
                ${dayData.press.map((row, idx) => `
                  <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fffbeb'};">
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${tipoTextColors[row.tipo] || '#374151'}; font-weight: 700;">${row.tipo || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: 600;">${row.maquina || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${row.modelo || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-family: monospace;">${row.numero || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; color: ${statusTextColors[row.status || '']}; font-weight: 600;">${statusLabels[row.status] || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px;">${row.responsable || '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;">${row.comentarios || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }

        await addSectionToPDF(dayHtml);
      }

      // Resumen
      const resumenHtml = `
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 2px solid #e2e8f0;">
          <h3 style="margin: 0 0 15px; font-size: 16px; color: #1e293b; font-weight: 700;">📊 Resumen de la Semana</h3>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 100px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #0ea5e9;">${totalAssy}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Ensambles</p>
            </div>
            <div style="flex: 1; min-width: 100px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #f97316;">${totalPress}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Prensas</p>
            </div>
            <div style="flex: 1; min-width: 100px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #22c55e;">${terminados}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Terminados</p>
            </div>
            <div style="flex: 1; min-width: 100px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #eab308;">${enProceso}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">En Proceso</p>
            </div>
            <div style="flex: 1; min-width: 100px; background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: #6b7280;">${pendientes}</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Pendientes</p>
            </div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 15px; color: #9ca3af; font-size: 10px;">
          Generado el ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      `;
      await addSectionToPDF(resumenHtml);

      pdf.save(`Reporte_Semana_${weekData?.weekNumber}_${weekData?.year}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setIsGeneratingPDF(false);
    }
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
            <div className="flex items-center gap-3">
              <button
                onClick={generateWeeklyPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPDF ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Generando...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span className="text-sm font-medium">Reporte</span>
                  </>
                )}
              </button>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm">En vivo</span>
              </div>
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
