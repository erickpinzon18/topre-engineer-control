import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const AssemblyDetail = () => {
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

  const loadHistory = async (assemblyType) => {
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
      
      // Para QC y TEACH, inicializar formulario vacío siempre
      if (assemblyType === 'QC') {
        setFormData({
          fechaAjuste: toLocalDateTimeString(new Date()),
          porcentajeObtenido: '',
          emisionPuntoCambio: '',
          estado: 'Pendiente',
          comentarios: '',
          linkReporteIR: ''
        });
        return historyData.length > 0;
      } else if (assemblyType === 'TEACH') {
        setFormData({
          tiempoEstablecidoJig1: '',
          tiempoObtenidoJig1: '',
          mejoraPorcentajeJig1: '',
          tiempoEstablecidoJig2: '',
          tiempoObtenidoJig2: '',
          mejoraPorcentajeJig2: '',
          emisionPuntoCambio: '',
          pzDestructivaJig1: '',
          pzDestructivaJig2: '',
          resultadoDestructivaJig1: '',
          resultadoDestructivaJig2: ''
        });
        return historyData.length > 0;
      }
      return false;
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
        
        // Cargar historial primero y verificar si existe
        const hasHistory = await loadHistory(data.tipo);
        
        // Solo inicializar formData si NO hay historial
        if (!hasHistory) {
          if (data.tipo === 'QC') {
            setFormData({
              fechaAjuste: toLocalDateTimeString(new Date()),
              porcentajeObtenido: '',
              emisionPuntoCambio: '',
              estado: 'Pendiente',
              comentarios: '',
              linkReporteIR: ''
            });
          } else if (data.tipo === 'TEACH') {
            setFormData({
              tiempoEstablecidoJig1: '',
              tiempoObtenidoJig1: '',
              mejoraPorcentajeJig1: '',
              tiempoEstablecidoJig2: '',
              tiempoObtenidoJig2: '',
              mejoraPorcentajeJig2: '',
              emisionPuntoCambio: '',
              pzDestructivaJig1: '',
              pzDestructivaJig2: '',
              resultadoDestructivaJig1: '',
              resultadoDestructivaJig2: ''
            });
          }
        }
      } else {
        alert('Ensamble no encontrado');
        navigate('/engineer');
      }
    } catch (error) {
      console.error('Error cargando ensamble:', error);
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

    // Si es QC, calcular automáticamente el estado basado en el porcentaje obtenido y el meta
    if (assembly?.tipo === 'QC' && name === 'porcentajeObtenido') {
      const porcentaje = parseFloat(value);
      const meta = parseFloat(assembly.porcentajeMeta || '97');
      if (!isNaN(porcentaje)) {
        setFormData(prev => ({
          ...prev,
          estado: porcentaje >= meta ? 'OK' : 'NG'
        }));
      }
    }

    // Si es TEACH, calcular automáticamente el porcentaje de mejora
    if (assembly?.tipo === 'TEACH') {
      // Para Jig 1
      if (name === 'tiempoEstablecidoJig1' || name === 'tiempoObtenidoJig1') {
        const establecido = name === 'tiempoEstablecidoJig1' ? parseFloat(value) : parseFloat(formData.tiempoEstablecidoJig1);
        const obtenido = name === 'tiempoObtenidoJig1' ? parseFloat(value) : parseFloat(formData.tiempoObtenidoJig1);
        
        if (!isNaN(establecido) && !isNaN(obtenido) && establecido > 0) {
          const mejora = ((establecido - obtenido) / establecido) * 100;
          setFormData(prev => ({
            ...prev,
            mejoraPorcentajeJig1: mejora.toFixed(2)
          }));
        }
      }

      // Para Jig 2
      if (name === 'tiempoEstablecidoJig2' || name === 'tiempoObtenidoJig2') {
        const establecido = name === 'tiempoEstablecidoJig2' ? parseFloat(value) : parseFloat(formData.tiempoEstablecidoJig2);
        const obtenido = name === 'tiempoObtenidoJig2' ? parseFloat(value) : parseFloat(formData.tiempoObtenidoJig2);
        
        if (!isNaN(establecido) && !isNaN(obtenido) && establecido > 0) {
          const mejora = ((establecido - obtenido) / establecido) * 100;
          setFormData(prev => ({
            ...prev,
            mejoraPorcentajeJig2: mejora.toFixed(2)
          }));
        }
      }
    }
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, 'assemblies', id);
      
      // Preparar datos a guardar
      const now = new Date();
      const dataToSave = { ...formData };
      
      // Si es QC y el campo fechaAjuste está vacío, establecer la fecha actual
      if (assembly?.tipo === 'QC' && !dataToSave.fechaAjuste) {
        dataToSave.fechaAjuste = toLocalDateTimeString(now);
      }
      
      // Calcular progreso según el tipo de ensamble
      let progress = 0;
      
      if (assembly?.tipo === 'QC') {
        // Para QC: usar el porcentaje obtenido como progreso
        const porcentaje = parseFloat(dataToSave.porcentajeObtenido);
        progress = !isNaN(porcentaje) ? Math.round(porcentaje) : 0;
      } else {
        // Para TEACH y otros: calcular basado en campos completados
        const totalFields = Object.keys(dataToSave).length;
        const filledFields = Object.values(dataToSave).filter(v => v !== '').length;
        progress = Math.round((filledFields / totalFields) * 100);
      }

      // Guardar en la subcolección history
      const historyRef = collection(db, 'assemblies', id, 'history');
      await addDoc(historyRef, {
        data: dataToSave,
        savedBy: userProfile?.name || currentUser.email,
        savedByUid: currentUser.uid,
        createdAt: now
      });

      // Actualizar el documento principal solo con el progreso
      await updateDoc(docRef, {
        progress: progress,
        updatedAt: now
      });

      // Actualizar el estado local del assembly con el nuevo progreso
      setAssembly(prev => ({
        ...prev,
        progress: progress,
        updatedAt: now
      }));

      alert('Información guardada exitosamente');
      
      // Limpiar el formulario
      if (assembly?.tipo === 'QC') {
        setFormData({
          fechaAjuste: toLocalDateTimeString(new Date()),
          porcentajeObtenido: '',
          emisionPuntoCambio: '',
          estado: 'Pendiente',
          comentarios: '',
          linkReporteIR: ''
        });
      } else if (assembly?.tipo === 'TEACH') {
        setFormData({
          tiempoEstablecidoJig1: '',
          tiempoObtenidoJig1: '',
          mejoraPorcentajeJig1: '',
          tiempoEstablecidoJig2: '',
          tiempoObtenidoJig2: '',
          mejoraPorcentajeJig2: '',
          emisionPuntoCambio: '',
          pzDestructivaJig1: '',
          pzDestructivaJig2: '',
          resultadoDestructivaJig1: '',
          resultadoDestructivaJig2: ''
        });
      }
      
      loadHistory(assembly.tipo); // Recargar historial
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
      loadHistory(assembly.tipo); // Recargar historial
    } catch (error) {
      console.error('Error eliminando registro:', error);
      alert('Error al eliminar el registro');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const calculateDaysRemaining = () => {
    if (!assembly?.fechaDeadline) return 0;
    const deadline = new Date(assembly.fechaDeadline);
    const today = new Date();
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleSendReport = () => {
    if (!assembly) return;

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

    // Construir HTML profesional
    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Ensamble</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">REPORTE DE ENSAMBLE</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">${assembly.tipo === 'QC' ? 'LEVEL UP - Mejora de Número de Parte' : 'Proceso TEACH'}</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <!-- Información General -->
        <div style="margin-bottom: 30px;">
            <h2 style="color: #0369a1; border-bottom: 2px solid #0369a1; padding-bottom: 10px; margin-bottom: 20px;">📋 Información General</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; width: 35%;">Máquina</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${assembly.maquina}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Modelo</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${assembly.modelo}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Número</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${assembly.numero}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Tipo</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;"><span style="background-color: ${assembly.tipo === 'QC' ? '#dbeafe' : '#d1fae5'}; color: ${assembly.tipo === 'QC' ? '#1e40af' : '#065f46'}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${assembly.tipo}</span></td>
                </tr>
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Responsable</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${assembly.userName}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Fecha de Inicio</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${assembly.fechaInicio}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Deadline</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${assembly.fechaDeadline}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Días Restantes</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong style="color: ${calculateDaysRemaining() < 7 ? '#dc2626' : '#16a34a'};">${calculateDaysRemaining()} días</strong></td>
                </tr>
            </table>
        </div>

        <!-- Progreso -->
        <div style="margin-bottom: 30px; background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0369a1;">
            <h3 style="margin-top: 0; color: #0369a1;">📊 Progreso General</h3>
            <div style="background-color: #e0e7ff; border-radius: 10px; height: 30px; overflow: hidden; margin-bottom: 10px;">
                <div style="background: linear-gradient(90deg, #0369a1 0%, #0284c7 100%); height: 100%; width: ${progress}%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; transition: width 0.3s ease;">${progress}%</div>
            </div>
            ${assembly.tipo === 'QC' ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #475569;"><strong>Meta:</strong> 97% para estado OK</p>` : ''}
        </div>

        <!-- Historial -->
        <div style="margin-bottom: 30px;">
            <h2 style="color: #0369a1; border-bottom: 2px solid #0369a1; padding-bottom: 10px; margin-bottom: 20px;">📝 Historial de Registros</h2>
            <p style="color: #64748b; margin-bottom: 20px;">${history.length} ${history.length === 1 ? 'registro guardado' : 'registros guardados'}</p>
            
            ${history.length === 0 
              ? '<div style="text-align: center; padding: 40px; background-color: #f8fafc; border-radius: 8px; color: #94a3b8;">No hay registros guardados aún.</div>'
              : history.map((record, index) => {
                  let recordHtml = `
                  <div style="margin-bottom: 25px; border: 2px solid ${index === 0 ? '#0369a1' : '#e2e8f0'}; border-radius: 8px; overflow: hidden;">
                      <!-- Header del Registro -->
                      <div style="background-color: ${index === 0 ? '#0369a1' : '#f1f5f9'}; color: ${index === 0 ? 'white' : '#334155'}; padding: 15px;">
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                              <div>
                                  <strong style="font-size: 16px;">Registro #${history.length - index}</strong>
                                  ${index === 0 ? '<span style="background-color: white; color: #0369a1; padding: 2px 8px; border-radius: 8px; font-size: 11px; margin-left: 10px; font-weight: bold;">ACTUAL</span>' : ''}
                              </div>
                              <div style="font-size: 13px; opacity: 0.9;">${record.createdAt?.toLocaleDateString('es-MX', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</div>
                          </div>
                      </div>
                      
                      <!-- Cuerpo del Registro -->
                      <div style="padding: 20px;">
                          <p style="margin: 0 0 15px 0; color: #64748b; font-size: 13px;"><strong>Guardado por:</strong> ${record.savedBy}</p>
                          
                          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                              ${Object.entries(record.data).map(([key, value]) => {
                                if (!value) return '';
                                const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim();
                                const isEstado = key === 'estado';
                                const isResultadoDestructiva = key === 'resultadoDestructivaJig1' || key === 'resultadoDestructivaJig2';
                                
                                let valueDisplay = value;
                                if (isEstado || isResultadoDestructiva) {
                                  const estadoColor = value === 'OK' ? '#16a34a' : value === 'NG' ? '#dc2626' : '#64748b';
                                  const estadoBg = value === 'OK' ? '#dcfce7' : value === 'NG' ? '#fee2e2' : '#f1f5f9';
                                  valueDisplay = `<span style="background-color: ${estadoBg}; color: ${estadoColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${value}</span>`;
                                }
                                
                                return `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; width: 40%;">${label}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${valueDisplay}</td>
                                </tr>`;
                              }).join('')}
                          </table>
                          
                          ${index < history.length - 1 && assembly.tipo === 'QC' ? (() => {
                            const currentPercent = parseFloat(record.data.porcentajeObtenido);
                            const previousPercent = parseFloat(history[index + 1].data.porcentajeObtenido);
                            
                            if (!isNaN(currentPercent) && !isNaN(previousPercent)) {
                              const diff = currentPercent - previousPercent;
                              const isImprovement = diff > 0;
                              const color = isImprovement ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b';
                              const arrow = isImprovement ? '↑' : diff < 0 ? '↓' : '→';
                              
                              return `
                              <div style="margin-top: 15px; padding: 12px; background-color: ${isImprovement ? '#f0fdf4' : diff < 0 ? '#fef2f2' : '#f8fafc'}; border-left: 3px solid ${color}; border-radius: 4px;">
                                  <strong style="color: ${color};">Variación vs. anterior: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}% ${arrow}</strong>
                              </div>`;
                            }
                            return '';
                          })() : ''}
                      </div>
                  </div>`;
                  return recordHtml;
                }).join('')
            }
        </div>

        <!-- Resumen Final -->
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 8px; border: 2px solid #0369a1;">
            <h2 style="color: #0369a1; margin-top: 0;">📌 Resumen</h2>
            <table style="width: 100%; font-size: 14px;">
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #475569;">Total de Registros:</td>
                    <td style="padding: 8px 0; color: #1e293b; text-align: right;"><strong>${history.length}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #475569;">Progreso Actual:</td>
                    <td style="padding: 8px 0; color: #1e293b; text-align: right;"><strong>${progress}%</strong></td>
                </tr>
                ${assembly.tipo === 'QC' && history.length > 0 ? (() => {
                  const lastPercent = parseFloat(history[0].data.porcentajeObtenido);
                  if (!isNaN(lastPercent)) {
                    return `
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #475569;">Último Porcentaje:</td>
                        <td style="padding: 8px 0; color: #1e293b; text-align: right;"><strong>${lastPercent}%</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #475569;">Estado:</td>
                        <td style="padding: 8px 0; text-align: right;"><strong style="color: ${lastPercent >= 97 ? '#16a34a' : '#dc2626'};">${lastPercent >= 97 ? 'OK ✓' : 'NG - Requiere mejora'}</strong></td>
                    </tr>`;
                  }
                  return '';
                })() : ''}
            </table>
        </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">
        <p style="margin: 5px 0;">Reporte generado el ${new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p style="margin: 5px 0; font-weight: 600; color: #64748b;">Sistema de Control de Ingeniería TOPRE</p>
    </div>

</body>
</html>`;

    // Abrir una nueva ventana con el reporte
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(htmlBody);
      reportWindow.document.close();
      
      // Mensaje de éxito
      alert('Reporte abierto en nueva ventana. Puedes:\n\n1. Imprimir (Ctrl/Cmd + P) y guardar como PDF\n2. Seleccionar todo (Ctrl/Cmd + A), copiar y pegar en tu correo\n3. Usar "Compartir" del navegador para enviar por correo');
    } else {
      alert('No se pudo abrir la ventana. Por favor, permite las ventanas emergentes para este sitio.');
    }
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

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/engineer')}
            className="text-sm font-medium text-sky-700 hover:text-sky-900 flex items-center"
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
                  assembly.tipo === 'QC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  Tipo: {assembly.tipo}
                </span>
                <h2 className="mt-3 text-lg sm:text-2xl font-semibold text-gray-800">
                  Ensamble: {assembly.maquina} / {assembly.modelo}
                </h2>
                <p className="text-sm text-gray-500">Número: {assembly.numero}</p>
              </div>
            </div>

            {/* Process Details Card */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="p-4 sm:p-5">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-5">
                  {assembly.tipo === 'QC' ? 'LEVEL UP - Mejora de Número de Parte' : 'Proceso TEACH'}
                </h3>

                <form className="space-y-4">
                  
                  {/* QC Fields */}
                  {assembly.tipo === 'QC' && (
                    <>
                      {/* Meta Indicator - Editable */}
                      <div className="bg-sky-50 border-l-4 border-sky-500 p-3 sm:p-4 mb-4">
                        <div className="flex items-start sm:items-center justify-between">
                          <div className="flex items-start sm:items-center">
                            <div className="shrink-0">
                              <svg className="h-5 w-5 text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-xs sm:text-sm text-sky-700">
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
                              className="w-16 px-2 py-1 text-sm border border-sky-300 rounded focus:ring-sky-500 focus:border-sky-500"
                            />
                            <span className="text-xs text-sky-600">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Ajuste
                          </label>
                          <input
                            type="datetime-local"
                            name="fechaAjuste"
                            value={formData.fechaAjuste || ''}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Emisión de Punto de Cambio
                          </label>
                          <input
                            type="text"
                            name="emisionPuntoCambio"
                            value={formData.emisionPuntoCambio || ''}
                            onChange={handleChange}
                            placeholder="Folio del punto de cambio"
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Porcentaje Obtenido (%)
                          </label>
                          <input
                            type="number"
                            name="porcentajeObtenido"
                            value={formData.porcentajeObtenido || ''}
                            onChange={handleChange}
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="Ej: 94.5"
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                          </label>
                          <div className={`w-full p-2 border rounded-md text-center font-semibold ${
                            formData.estado === 'OK' 
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : formData.estado === 'NG'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}>
                            {formData.estado || 'Pendiente'}
                          </div>
                        </div>
                      </div>

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
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Link de Reporte IR
                        </label>
                        <input
                          type="url"
                          name="linkReporteIR"
                          value={formData.linkReporteIR || ''}
                          onChange={handleChange}
                          placeholder="https://..."
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>
                    </>
                  )}

                  {/* TEACH Fields */}
                  {assembly.tipo === 'TEACH' && (
                    <>
                      <div className="bg-green-50 border-l-4 border-green-500 p-3 sm:p-4 mb-4">
                        <div className="flex items-start sm:items-center">
                          <div className="shrink-0">
                            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm text-green-700">
                              <span className="font-semibold">Proceso TEACH</span> - Registra la información del proceso de enseñanza del robot
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Comparación de Tiempos - Jig 1 */}
                      <div className="mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-3 flex items-center">
                          <span className="bg-blue-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                          Jig 1 - Comparación de Tiempos
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tiempo Establecido (seg)
                            </label>
                            <input
                              type="number"
                              name="tiempoEstablecidoJig1"
                              value={formData.tiempoEstablecidoJig1 || ''}
                              onChange={handleChange}
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Tiempo del manual</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tiempo Obtenido (seg)
                            </label>
                            <input
                              type="number"
                              name="tiempoObtenidoJig1"
                              value={formData.tiempoObtenidoJig1 || ''}
                              onChange={handleChange}
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Tiempo real alcanzado</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mejora (%)
                            </label>
                            <div className={`w-full p-2 border rounded-md text-center font-bold text-lg ${
                              formData.mejoraPorcentajeJig1 && parseFloat(formData.mejoraPorcentajeJig1) > 0
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : formData.mejoraPorcentajeJig1 && parseFloat(formData.mejoraPorcentajeJig1) < 0
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}>
                              {formData.mejoraPorcentajeJig1 ? `${formData.mejoraPorcentajeJig1}%` : '--'}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Calculado automáticamente</p>
                          </div>
                        </div>
                      </div>

                      {/* Comparación de Tiempos - Jig 2 */}
                      <div className="mb-6 p-3 sm:p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                        <h4 className="text-xs sm:text-sm font-semibold text-purple-900 mb-3 flex items-center">
                          <span className="bg-purple-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                          Jig 2 - Comparación de Tiempos
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tiempo Establecido (seg)
                            </label>
                            <input
                              type="number"
                              name="tiempoEstablecidoJig2"
                              value={formData.tiempoEstablecidoJig2 || ''}
                              onChange={handleChange}
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Tiempo del manual</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tiempo Obtenido (seg)
                            </label>
                            <input
                              type="number"
                              name="tiempoObtenidoJig2"
                              value={formData.tiempoObtenidoJig2 || ''}
                              onChange={handleChange}
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Tiempo real alcanzado</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mejora (%)
                            </label>
                            <div className={`w-full p-2 border rounded-md text-center font-bold text-lg ${
                              formData.mejoraPorcentajeJig2 && parseFloat(formData.mejoraPorcentajeJig2) > 0
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : formData.mejoraPorcentajeJig2 && parseFloat(formData.mejoraPorcentajeJig2) < 0
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}>
                              {formData.mejoraPorcentajeJig2 ? `${formData.mejoraPorcentajeJig2}%` : '--'}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Calculado automáticamente</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Emisión de Punto de Cambio
                        </label>
                        <input
                          type="text"
                          name="emisionPuntoCambio"
                          value={formData.emisionPuntoCambio || ''}
                          onChange={handleChange}
                          placeholder="Folio del punto de cambio (si aplica por reducción de tiempo)"
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Solo aplica si se redujo tiempo en el proceso
                        </p>
                      </div>

                      {/* Sección Destructiva */}
                      <div className="mt-6 pt-6 border-t-2 border-gray-200">
                        <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-4">Prueba Destructiva</h4>
                        
                        {/* Jig 1 */}
                        <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Jig 1</h5>
                          
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cantidad de Piezas
                            </label>
                            <input
                              type="number"
                              name="pzDestructivaJig1"
                              value={formData.pzDestructivaJig1 || ''}
                              onChange={handleChange}
                              min="0"
                              placeholder="0"
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Resultado de Prueba Destructiva
                            </label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, resultadoDestructivaJig1: 'OK' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.resultadoDestructivaJig1 === 'OK'
                                    ? 'bg-green-600 text-white shadow-md scale-105'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                OK - Pasó prueba
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, resultadoDestructivaJig1: 'NG' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.resultadoDestructivaJig1 === 'NG'
                                    ? 'bg-red-600 text-white shadow-md scale-105'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                NG - No pasó
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Jig 2 */}
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Jig 2</h5>
                          
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cantidad de Piezas
                            </label>
                            <input
                              type="number"
                              name="pzDestructivaJig2"
                              value={formData.pzDestructivaJig2 || ''}
                              onChange={handleChange}
                              min="0"
                              placeholder="0"
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Resultado de Prueba Destructiva
                            </label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, resultadoDestructivaJig2: 'OK' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.resultadoDestructivaJig2 === 'OK'
                                    ? 'bg-green-600 text-white shadow-md scale-105'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                OK - Pasó prueba
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, resultadoDestructivaJig2: 'NG' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  formData.resultadoDestructivaJig2 === 'NG'
                                    ? 'bg-red-600 text-white shadow-md scale-105'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                NG - No pasó
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Save Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="w-full bg-sky-700 hover:bg-sky-800 text-white font-bold py-3 px-4 rounded-lg shadow-md transition"
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
                  <div className="bg-sky-100 text-sky-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm self-start">
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
                        <div 
                          key={record.id} 
                          className={`border rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                            index === 0 
                              ? 'border-sky-400 shadow-md bg-linear-to-br from-sky-50 to-white' 
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          {/* Header */}
                          <div className={`px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between ${
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
                                  ? 'text-white hover:bg-sky-400' 
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
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600">
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
                                  {Object.entries(record.data).map(([key, value]) => {
                                    if (!value) return null;
                                    
                                    const isEstado = key === 'estado';
                                    const isResultadoDestructiva = key === 'resultadoDestructivaJig1' || key === 'resultadoDestructivaJig2';
                                    const isMejora = key === 'mejoraPorcentajeJig1' || key === 'mejoraPorcentajeJig2';
                                    
                                    return (
                                      <tr key={key} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-2 sm:py-3 px-4 sm:pr-4 text-xs sm:text-sm font-semibold text-gray-700 align-top w-1/2">
                                          {fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                        </td>
                                        <td className="py-2 sm:py-3 px-4 sm:px-0 text-xs sm:text-sm text-gray-900 font-medium">
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
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${
                                              parseFloat(value) > 0
                                                ? 'bg-linear-to-r from-green-100 to-green-50 text-green-700 border-2 border-green-300'
                                                : parseFloat(value) < 0
                                                ? 'bg-linear-to-r from-red-100 to-red-50 text-red-700 border-2 border-red-300'
                                                : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                                            }`}>
                                              {parseFloat(value) > 0 ? '↑ ' : parseFloat(value) < 0 ? '↓ ' : ''}{value}%
                                            </span>
                                          ) : (
                                            value
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Comparison with previous record */}
                            {index < history.length - 1 && assembly?.tipo === 'QC' && (
                              <div className="mt-5 pt-4 border-t-2 border-gray-200">
                                {(() => {
                                  const currentPercent = parseFloat(record.data.porcentajeObtenido);
                                  const previousPercent = parseFloat(history[index + 1].data.porcentajeObtenido);
                                  
                                  if (!isNaN(currentPercent) && !isNaN(previousPercent)) {
                                    const diff = currentPercent - previousPercent;
                                    const isImprovement = diff > 0;
                                    
                                    return (
                                      <div className={`flex items-center justify-between p-3 rounded-lg ${
                                        isImprovement 
                                          ? 'bg-green-50 border-l-4 border-green-500' 
                                          : diff < 0 
                                          ? 'bg-red-50 border-l-4 border-red-500' 
                                          : 'bg-gray-50 border-l-4 border-gray-400'
                                      }`}>
                                        <span className="text-sm font-medium text-gray-700 flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                          </svg>
                                          Variación vs. registro anterior:
                                        </span>
                                        <span className={`text-base font-bold px-3 py-1 rounded-lg ${
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Send Report Card */}
            {/* <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Enviar Reporte
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Genera y envía un reporte completo por correo electrónico con toda la información del ensamble e historial.
                </p>
                <button
                  onClick={handleSendReport}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition flex items-center justify-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span>Enviar Reporte por Correo</span>
                </button>
              </div>
            </div> */}

            {/* Current Status Card */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="p-4 sm:p-5">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Estado Actual
                </h3>
                
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm sm:text-base font-medium text-sky-700">Progreso General</span>
                    <span className="text-xs sm:text-sm font-medium text-sky-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
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
                  <li className="py-2.5 sm:py-3 flex justify-between text-xs sm:text-sm">
                    <span className="font-medium text-gray-600">Deadline:</span>
                    <span className="text-gray-900 text-right ml-2">{assembly.fechaDeadline}</span>
                  </li>
                  <li className="py-2.5 sm:py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs sm:text-sm">
                    <span className="font-medium text-sky-600 mb-1 sm:mb-0">Fecha de Préstamo:</span>
                    <input
                      type="date"
                      value={assembly.fechaPrestamo || ''}
                      onChange={(e) => handleAssemblyFieldChange('fechaPrestamo', e.target.value)}
                      className="px-2 py-1 border border-sky-300 rounded focus:ring-sky-500 focus:border-sky-500 text-right"
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

export default AssemblyDetail;
