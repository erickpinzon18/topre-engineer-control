import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import PhotoUploader from '../components/PhotoUploader';

const HotPressDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [assembly, setAssembly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [history, setHistory] = useState([]);

  // Helper para convertir fecha a formato datetime-local sin problemas de zona horaria
  const toLocalDateTimeString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    const loadData = async () => {
      await loadAssembly();
    };
    loadData();
  }, [id]);

  const initializeFormData = (tipo) => {
    if (tipo === 'LASER') {
      return {
        fechaAjuste: toLocalDateTimeString(new Date()),
        puntoCambio: '',
        porcentajeObtenido: '',
        pruebaEnsamble: '',
        comentarios: '',
        fotos: []
      };
    } else {
      // QC - same as Press
      return {
        fechaAjuste: toLocalDateTimeString(new Date()),
        emisionPuntoCambio: '',
        mikomi: '',
        mikomiPorcentaje: '',
        atari: '',
        atariPorcentaje: '',
        ajustesExtras: '',
        ajustesExtrasPorcentaje: '',
        comentarios: '',
        fotos: [],
        estado: 'Pendiente',
        porcentajeObtenido: 0
      };
    }
  };

  const loadHistory = async (tipo) => {
    try {
      const historyRef = collection(db, 'assemblies', id, 'history');
      const q = query(historyRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const historyData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      setHistory(historyData);
      setFormData(initializeFormData(tipo));
      
      return historyData.length > 0;
    } catch (error) {
      console.error('Error cargando historial:', error);
      return false;
    }
  };

  const loadAssembly = async () => {
    try {
      const docRef = doc(db, 'assemblies', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setAssembly(data);
        await loadHistory(data.tipo);
      } else {
        alert('Ajuste no encontrado');
        navigate('/engineer/hot-press');
      }
    } catch (error) {
      console.error('Error cargando ajuste:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssemblyFieldChange = async (field, value) => {
    try {
      const docRef = doc(db, 'assemblies', id);
      await updateDoc(docRef, { [field]: value });
      setAssembly(prev => ({ ...prev, [field]: value }));
    } catch (error) {
      console.error('Error actualizando campo:', error);
      alert('Error al actualizar el campo');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Para QC, calcular porcentaje y estado automáticamente basado en los 3 checks
    if (assembly?.tipo === 'QC') {
      const camposValidacion = ['mikomi', 'atari', 'ajustesExtras'];

      if (camposValidacion.includes(name)) {
        const getValor = (campo) => {
          if (name === campo) return value;
          return formData[campo];
        };

        let cumplidos = 0;
        if (getValor('mikomi') === 'OK') cumplidos++;
        if (getValor('atari') === 'OK') cumplidos++;
        if (getValor('ajustesExtras') === 'OK') cumplidos++;

        const porcentaje = Math.round((cumplidos / 3) * 100);
        const estado = cumplidos === 3 ? 'OK' : 'Pendiente';

        setFormData(prev => ({
          ...prev,
          porcentajeObtenido: porcentaje,
          estado: estado
        }));
      }
    }
  };

  // Función para manejar clicks en botones OK/NG y recalcular porcentaje
  const handleCheckChange = (campo, valor) => {
    setFormData(prev => {
      const newData = { ...prev, [campo]: valor };
      
      // Para QC, recalcular porcentaje basado en los 3 campos
      if (assembly?.tipo === 'QC') {
        let cumplidos = 0;
        if (newData.mikomi === 'OK') cumplidos++;
        if (newData.atari === 'OK') cumplidos++;
        if (newData.ajustesExtras === 'OK') cumplidos++;
        
        const porcentaje = Math.round((cumplidos / 3) * 100);
        const estado = cumplidos === 3 ? 'OK' : 'Pendiente';
        
        return {
          ...newData,
          porcentajeObtenido: porcentaje,
          estado: estado
        };
      }
      
      return newData;
    });
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, 'assemblies', id);
      
      // Preparar datos a guardar
      const now = new Date();
      const dataToSave = { 
        ...formData,
        numeroParte: assembly.numero,
        fechaRegistro: now.toISOString()
      };
      
      if (!dataToSave.fechaAjuste) {
        dataToSave.fechaAjuste = toLocalDateTimeString(now);
      }
      
      // El progreso se calcula según el tipo
      let progress = 0;
      if (assembly.tipo === 'LASER') {
        progress = parseFloat(dataToSave.porcentajeObtenido) || 0;
      } else {
        progress = dataToSave.porcentajeObtenido || 0;
      }

      // Guardar en la subcolección history
      const historyRef = collection(db, 'assemblies', id, 'history');
      await addDoc(historyRef, {
        data: dataToSave,
        savedBy: userProfile?.name || currentUser.email,
        savedByUid: currentUser.uid,
        createdAt: now
      });

      // Actualizar el documento principal con el progreso
      await updateDoc(docRef, {
        progress: progress,
        updatedAt: now
      });

      // Actualizar el estado local del assembly
      setAssembly(prev => ({
        ...prev,
        progress: progress,
        updatedAt: now
      }));

      alert('Información guardada exitosamente');
      
      // Limpiar el formulario
      setFormData(initializeFormData(assembly.tipo));
      loadHistory(assembly.tipo);
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar la información');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      return;
    }

    try {
      const recordRef = doc(db, 'assemblies', id, 'history', recordId);
      await deleteDoc(recordRef);
      alert('Registro eliminado exitosamente');
      loadHistory(assembly.tipo);
    } catch (error) {
      console.error('Error eliminando registro:', error);
      alert('Error al eliminar el registro');
    }
  };

  const calculateDaysRemaining = () => {
    if (!assembly?.fechaDeadline) return 0;
    const deadline = new Date(assembly.fechaDeadline);
    const today = new Date();
    const diffTime = deadline - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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

  if (!assembly) {
    return null;
  }

  const daysRemaining = calculateDaysRemaining();
  const isLaser = assembly.tipo === 'LASER';
  
  // Obtener el porcentaje y estado del último registro
  const lastRecord = history.length > 0 ? history[0] : null;
  const lastRecordData = lastRecord?.data || {};
  
  // Calcular progreso desde campos individuales si no hay porcentajeObtenido
  let progress = 0;
  if (isLaser) {
    progress = parseFloat(lastRecordData.porcentajeObtenido) || 0;
  } else {
    progress = lastRecordData.porcentajeObtenido || 0;
    if (progress === 0 && (lastRecordData.mikomi || lastRecordData.atari || lastRecordData.ajustesExtras)) {
      let cumplidos = 0;
      if (lastRecordData.mikomi === 'OK') cumplidos++;
      if (lastRecordData.atari === 'OK') cumplidos++;
      if (lastRecordData.ajustesExtras === 'OK') cumplidos++;
      progress = Math.round((cumplidos / 3) * 100);
    }
  }
  
  const currentStatus = progress === 100 ? 'OK' : (lastRecordData.estado || 'Pendiente');

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/engineer/hot-press')}
            className="text-sm font-medium text-red-700 hover:text-red-900 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Volver al Dashboard
          </button>
        </div>

        {/* Layout: 2 columnas + sidebar */}
        <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* General Info Card */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="p-4 sm:p-5">
                <span className={`px-2.5 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  isLaser ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  Tipo: {isLaser ? 'AJUSTE EN LASER' : 'QC'}
                </span>
                <h2 className="mt-3 text-lg sm:text-2xl font-semibold text-gray-800">
                  Ajuste: {assembly.maquina} / {assembly.modelo}
                </h2>
                <p className="text-sm text-gray-500">Número: {assembly.numero}</p>
              </div>
            </div>

            {/* Process Details Card */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="p-4 sm:p-5">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-5">
                  {isLaser ? 'Ajuste en Laser' : 'Ajuste en Troquel'}
                </h3>

                <form className="space-y-4">
                  
                  {/* Meta Indicator - Editable (solo para QC) */}
                  {!isLaser && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 mb-4">
                      <div className="flex items-start sm:items-center justify-between">
                        <div className="flex items-start sm:items-center">
                          <div className="shrink-0">
                            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm text-red-700">
                              <span className="font-semibold">Porcentaje Meta: {assembly.porcentajeMeta || '97'}%</span> - Alcanzar este valor para estado OK
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={assembly.porcentajeMeta || ''}
                            onChange={(e) => handleAssemblyFieldChange('porcentajeMeta', e.target.value)}
                            onBlur={(e) => {
                              if (!e.target.value) {
                                handleAssemblyFieldChange('porcentajeMeta', '97');
                              }
                            }}
                            placeholder="97"
                            className="w-16 px-2 py-1 text-sm border border-red-300 rounded focus:ring-red-500 focus:border-red-500"
                          />
                          <span className="text-xs text-red-600">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Barra de Progreso de Validación */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-800">Progreso de Validación</h4>
                      <span className={`text-lg font-bold ${
                        (isLaser ? parseFloat(formData.porcentajeObtenido) >= 100 : formData.porcentajeObtenido === 100) ? 'text-green-600' : 
                        (parseFloat(formData.porcentajeObtenido) || 0) > 0 ? 'text-orange-600' : 'text-gray-400'
                      }`}>{formData.porcentajeObtenido || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          (isLaser ? parseFloat(formData.porcentajeObtenido) >= 100 : formData.porcentajeObtenido === 100) ? 'bg-green-500' : 
                          (parseFloat(formData.porcentajeObtenido) || 0) > 0 ? 'bg-orange-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${Math.min(parseFloat(formData.porcentajeObtenido) || 0, 100)}%` }}
                      ></div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {isLaser ? 'El progreso se basa en el porcentaje obtenido' : 'Si todos los campos están en OK, el progreso será 100% y el estado OK'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Ajuste
                      </label>
                      <input
                        type="datetime-local"
                        name="fechaAjuste"
                        value={formData.fechaAjuste || ''}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    {!isLaser && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Emisión Punto de Cambio
                        </label>
                        <input
                          type="text"
                          name="emisionPuntoCambio"
                          value={formData.emisionPuntoCambio || ''}
                          onChange={handleChange}
                          placeholder="Folio del punto de cambio"
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* QC Checklist de Validación */}
                  {!isLaser && (
                    <div className="mb-6 p-4 bg-linear-to-br from-blue-50 to-sky-50 rounded-lg border-2 border-blue-200">
                      <h4 className="text-md font-bold text-blue-900 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 text-blue-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Checklist de Validación Hot Press
                      </h4>
                      
                      <div className="space-y-4">
                        {/* 1. ATARI */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            1. ATARI
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => handleCheckChange('atari', 'OK')}
                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.atari === 'OK'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCheckChange('atari', 'NG')}
                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.atari === 'NG'
                                    ? 'bg-red-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                NG
                              </button>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Porcentaje Obtenido
                              </label>
                              <input
                                type="number"
                                name="atariPorcentaje"
                                value={formData.atariPorcentaje || ''}
                                onChange={handleChange}
                                placeholder="Ej: 96.8"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 2. MIKOMI */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            2. MIKOMI
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => handleCheckChange('mikomi', 'OK')}
                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.mikomi === 'OK'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCheckChange('mikomi', 'NG')}
                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.mikomi === 'NG'
                                    ? 'bg-red-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                NG
                              </button>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Porcentaje Obtenido
                              </label>
                              <input
                                type="number"
                                name="mikomiPorcentaje"
                                value={formData.mikomiPorcentaje || ''}
                                onChange={handleChange}
                                placeholder="Ej: 98.5"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. AJUSTES EXTRAS */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            3. AJUSTES EXTRAS
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => handleCheckChange('ajustesExtras', 'OK')}
                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.ajustesExtras === 'OK'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCheckChange('ajustesExtras', 'NG')}
                                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.ajustesExtras === 'NG'
                                    ? 'bg-red-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                NG
                              </button>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Porcentaje Obtenido
                              </label>
                              <input
                                type="number"
                                name="ajustesExtrasPorcentaje"
                                value={formData.ajustesExtrasPorcentaje || ''}
                                onChange={handleChange}
                                placeholder="Ej: 97.2"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LASER Form Fields */}
                  {isLaser && (
                    <div className="mb-6 p-4 bg-linear-to-br from-purple-50 to-violet-50 rounded-lg border-2 border-purple-200">
                      <h4 className="text-md font-bold text-purple-900 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 text-purple-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                        Datos del Ajuste en Laser
                      </h4>
                      
                      <div className="space-y-4">
                        {/* 1. Punto de Cambio */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            1. Punto de Cambio
                          </label>
                          <input
                            type="text"
                            name="puntoCambio"
                            value={formData.puntoCambio || ''}
                            onChange={handleChange}
                            placeholder="Ingrese el punto de cambio"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>

                        {/* 2. Porcentaje Obtenido */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            2. Porcentaje Obtenido
                          </label>
                          <input
                            type="number"
                            name="porcentajeObtenido"
                            value={formData.porcentajeObtenido || ''}
                            onChange={handleChange}
                            placeholder="Ej: 97.5"
                            step="0.1"
                            min="0"
                            max="100"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>

                        {/* 3. Prueba en Ensamble */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            3. Prueba en Ensamble (Juicio)
                          </label>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => handleCheckChange('pruebaEnsamble', 'OK')}
                              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                formData.pruebaEnsamble === 'OK'
                                  ? 'bg-green-600 text-white shadow-md'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCheckChange('pruebaEnsamble', 'NG')}
                              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
                                formData.pruebaEnsamble === 'NG'
                                  ? 'bg-red-600 text-white shadow-md'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              NG
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evidencia Fotográfica */}
                  <PhotoUploader
                    userId={currentUser?.uid}
                    assemblyId={id}
                    photos={formData.fotos || []}
                    onPhotosChange={(newPhotos) => setFormData(prev => ({ ...prev, fotos: newPhotos }))}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentarios
                    </label>
                    <textarea
                      name="comentarios"
                      value={formData.comentarios || ''}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Observaciones o notas adicionales..."
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-lg shadow-md transition"
                    >
                      Guardar Información
                    </button>
                  </div>
                </form>

              </div>
            </div>

            {/* History Section */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
              <div className="px-4 sm:px-6 py-4 sm:py-5 bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-600 p-2 rounded-lg">
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
                  <div className="bg-red-100 text-red-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm self-start">
                    Total: {history.length}
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 bg-gray-50">
                {history.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                    <p className="text-gray-500 font-medium text-base">No hay registros guardados</p>
                    <p className="text-gray-400 text-sm mt-2">Completa el formulario y presiona "Guardar Información"</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {history.map((record, index) => {
                      const fieldLabels = isLaser ? {
                        fechaAjuste: 'Fecha de Ajuste',
                        puntoCambio: 'Punto de Cambio',
                        porcentajeObtenido: 'Porcentaje Obtenido',
                        pruebaEnsamble: 'Prueba en Ensamble',
                        comentarios: 'Comentarios',
                        numeroParte: 'Número de Parte'
                      } : {
                        fechaAjuste: 'Fecha de Ajuste',
                        emisionPuntoCambio: 'Punto de Cambio',
                        mikomi: 'MIKOMI',
                        mikomiPorcentaje: 'Porcentaje MIKOMI',
                        atari: 'ATARI',
                        atariPorcentaje: 'Porcentaje ATARI',
                        ajustesExtras: 'AJUSTES EXTRAS',
                        ajustesExtrasPorcentaje: 'Porcentaje Ajustes Extras',
                        porcentajeObtenido: 'Progreso Validación (%)',
                        estado: 'Estado',
                        comentarios: 'Comentarios',
                        numeroParte: 'Número de Parte'
                      };

                      return (
                        <div 
                          key={record.id} 
                          className={`border rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                            index === 0 
                              ? 'border-red-400 shadow-md bg-linear-to-br from-red-50 to-white' 
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          {/* Header */}
                          <div className={`px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between ${
                            index === 0 
                              ? 'bg-linear-to-r from-red-500 to-red-600 border-b border-red-400' 
                              : 'bg-linear-to-r from-gray-100 to-gray-50 border-b border-gray-200'
                          }`}>
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-bold text-sm sm:text-base shadow-md ${
                                index === 0 
                                  ? 'bg-white text-red-600' 
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
                                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-white text-red-600 rounded-full">
                                      Actual
                                    </span>
                                  )}
                                </h4>
                                <p className={`text-xs mt-1 ${
                                  index === 0 ? 'text-red-100' : 'text-gray-500'
                                }`}>
                                  {record.createdAt?.toLocaleDateString('es-MX', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className={`p-2 rounded-lg transition-all ${
                                index === 0 
                                  ? 'text-white hover:bg-red-400' 
                                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title="Eliminar registro"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>

                          {/* Body */}
                          <div className="p-4 sm:p-5">
                            {/* User Info */}
                            <div className="mb-4 sm:mb-5 pb-3 sm:pb-4 border-b-2 border-gray-100 flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Guardado por</p>
                                <p className="text-xs sm:text-sm font-semibold text-gray-900">{record.savedBy}</p>
                              </div>
                            </div>

                            {/* Data Table */}
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                              <table className="min-w-full">
                                <tbody className="divide-y divide-gray-100">
                                  {(() => {
                                    const fieldOrder = isLaser ? [
                                      'fechaAjuste',
                                      'puntoCambio',
                                      'porcentajeObtenido',
                                      'pruebaEnsamble',
                                      'numeroParte',
                                      'comentarios'
                                    ] : [
                                      'fechaAjuste',
                                      'atari',
                                      'atariPorcentaje',
                                      'mikomi',
                                      'mikomiPorcentaje',
                                      'ajustesExtras',
                                      'ajustesExtrasPorcentaje',
                                      'porcentajeObtenido',
                                      'estado',
                                      'numeroParte',
                                      'comentarios'
                                    ];
                                    
                                    const sortedEntries = Object.entries(record.data).sort((a, b) => {
                                      const indexA = fieldOrder.indexOf(a[0]);
                                      const indexB = fieldOrder.indexOf(b[0]);
                                      if (indexA === -1 && indexB === -1) return 0;
                                      if (indexA === -1) return 1;
                                      if (indexB === -1) return -1;
                                      return indexA - indexB;
                                    });
                                    
                                    return sortedEntries.map(([key, value]) => {
                                    if (!value) return null;
                                    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return null;
                                    if (key === 'fechaRegistro') return null;
                                    
                                    const isEstado = key === 'estado';
                                    const isCheckField = key === 'mikomi' || key === 'atari' || key === 'ajustesExtras' || key === 'pruebaEnsamble';
                                    
                                    return (
                                      <tr key={key} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-2 sm:py-3 px-4 sm:pr-4 text-xs sm:text-sm font-semibold text-gray-700 align-top w-1/2">
                                          {fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                        </td>
                                        <td className="py-2 sm:py-3 px-4 sm:px-0 text-xs sm:text-sm text-gray-900 font-medium">
                                          {(isEstado || isCheckField) ? (
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                              value === 'OK' 
                                                ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                                                : value === 'NG'
                                                ? 'bg-red-100 text-red-800 border-2 border-red-300'
                                                : 'bg-gray-100 text-gray-800 border-2 border-gray-200'
                                            }`}>
                                              {value}
                                            </span>
                                          ) : (
                                            value
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  });
                                  })()}
                                </tbody>
                              </table>
                            </div>

                            {/* Evidencia Fotográfica */}
                            {record.data.fotos && record.data.fotos.length > 0 && (
                              <div className="mt-5 pt-4 border-t-2 border-gray-200">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-red-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                  </svg>
                                  Evidencia Fotográfica ({record.data.fotos.length})
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {record.data.fotos.map((foto, fotoIndex) => (
                                    <a 
                                      key={fotoIndex} 
                                      href={foto.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <img 
                                        src={foto.url} 
                                        alt={foto.name || `Foto ${fotoIndex + 1}`}
                                        className="w-full h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Current Status Card */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="p-4 sm:p-5">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Estado Actual
                </h3>
                
                {/* Estado del último registro */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Estado:</span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border-2 ${
                      currentStatus === 'OK' 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : currentStatus === 'NG'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}>
                      {currentStatus}
                    </span>
                  </div>
                </div>

                {/* Progreso de Validación */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm sm:text-base font-medium text-red-700">Progreso de Validación</span>
                    <span className={`text-xs sm:text-sm font-bold ${
                      progress === 100 ? 'text-green-600' :
                      progress > 0 ? 'text-orange-600' : 'text-gray-400'
                    }`}>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${
                      progress === 100 ? 'bg-green-500' :
                      progress > 0 ? 'bg-orange-500' : 'bg-gray-300'
                    }`} style={{ width: `${progress}%` }}></div>
                  </div>
                  {!lastRecord && (
                    <p className="text-xs text-gray-500 mt-1">Sin registros aún</p>
                  )}
                </div>

                {/* Info List */}
                <ul className="mt-5 divide-y divide-gray-200">
                  <li className="py-2.5 sm:py-3 flex justify-between text-xs sm:text-sm">
                    <span className="font-medium text-gray-600">Responsable:</span>
                    <span className="text-gray-900 text-right ml-2">{assembly.userName}</span>
                  </li>
                  <li className="py-2.5 sm:py-3 flex justify-between text-xs sm:text-sm">
                    <span className="font-medium text-gray-600">Fecha de Inicio:</span>
                    <span className="text-gray-900 text-right ml-2">{assembly.fechaInicio}</span>
                  </li>
                  <li className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs sm:text-sm">
                    <span className="font-medium text-red-600 mb-1 sm:mb-0">Fecha Límite:</span>
                    <input
                      type="date"
                      value={assembly.fechaDeadline || ''}
                      onChange={(e) => handleAssemblyFieldChange('fechaDeadline', e.target.value)}
                      className="px-2 py-1 border border-red-300 rounded focus:ring-red-500 focus:border-red-500 text-right"
                    />
                  </li>
                  <li className="py-2.5 sm:py-3 flex justify-between text-xs sm:text-sm">
                    <span className={`font-medium ${daysRemaining < 7 ? 'text-red-600' : 'text-gray-600'}`}>
                      Días Restantes:
                    </span>
                    <span className={`font-semibold text-right ml-2 ${daysRemaining < 7 ? 'text-red-600' : 'text-gray-900'}`}>
                      {daysRemaining} días
                    </span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default HotPressDetail;
