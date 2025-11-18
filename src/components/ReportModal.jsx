import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAuth } from "../contexts/AuthContext";

const ReportModal = ({ isOpen, onClose, assemblies }) => {
  const { userProfile, currentUser } = useAuth();
  const [selectedAssemblies, setSelectedAssemblies] = useState([]);
  const [reportType, setReportType] = useState("pdf"); // 'pdf' o 'email'
  const [emailRecipient, setEmailRecipient] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleAssembly = (assemblyId) => {
    setSelectedAssemblies((prev) =>
      prev.includes(assemblyId)
        ? prev.filter((id) => id !== assemblyId)
        : [...prev, assemblyId]
    );
  };

  const toggleAll = () => {
    if (selectedAssemblies.length === assemblies.length) {
      setSelectedAssemblies([]);
    } else {
      setSelectedAssemblies(assemblies.map((a) => a.id));
    }
  };

  const generatePDF = async () => {
    if (selectedAssemblies.length === 0) {
      alert('Por favor selecciona al menos un ensamble');
      return;
    }

    setIsGenerating(true);

    try {
      const selectedData = assemblies.filter((a) =>
        selectedAssemblies.includes(a.id)
      );

      // Crear un contenedor temporal
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '1000px';
      container.style.padding = '30px';
      container.style.backgroundColor = '#ffffff';
      
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #333; background: #ffffff; max-width: 100%;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%); padding: 25px 20px; text-align: center; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: rgba(255,255,255,0.95); display: inline-block; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;">
              <span style="font-size: 24px;">📊</span>
            </div>
            <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Reporte de Ensambles</h1>
            <div style="background: rgba(255,255,255,0.15); display: inline-block; padding: 6px 16px; border-radius: 20px; margin-bottom: 8px;">
              <p style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 600;">TOPRE - Control de Ingeniería</p>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
              <p style="color: #e0f2fe; margin: 4px 0; font-size: 12px;">📅 ${new Date().toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p style="color: #e0f2fe; margin: 4px 0; font-size: 12px;">👤 Generado por: <strong>${userProfile?.name || currentUser?.email || 'Usuario'}</strong></p>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 0 10px;">
            ${generateHTMLSections(selectedData)}
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding: 16px; background: #f8fafc; border-top: 3px solid #0284c7; text-align: center; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; color: #64748b; font-size: 10px; font-weight: 600;">© 2025 Topre. Todos los derechos reservados.</p>
            <p style="margin: 0; color: #94a3b8; font-size: 9px;">Sistema de Control de Ingeniería v1.0 - ByUphy.mx</p>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Generar canvas del contenido
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      // Crear PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      const fileName = `Reporte_Ensambles_${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      alert('✅ PDF generado y descargado exitosamente!');
      onClose();
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('❌ Error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateHTMLSections = (data) => {
    let html = '';
    
    const qcAssemblies = data.filter(a => a.tipo === 'QC');
    if (qcAssemblies.length > 0) {
      html += `
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e3a8a; padding: 12px 16px; font-weight: bold; font-size: 15px; border-left: 5px solid #2563eb; margin-bottom: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
            <span style="font-size: 18px; margin-right: 6px;">🛡️</span>
            <span style="vertical-align: middle;">QC - Level Up</span>
            <span style="background: rgba(255,255,255,0.7); color: #1e40af; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 8px;">${qcAssemblies.length} ensambles</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); table-layout: fixed;">
            <thead>
              <tr style="background: linear-gradient(to bottom, #f9fafb, #f3f4f6);">
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 6%;">Tipo</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 9%;">Máquina</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 8%;">Modelo</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 10%;">Número</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 13%;">% Actual</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 8%;">Estado</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 24%;">Comentarios</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 11%;">Inicio</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 11%;">Deadline</th>
              </tr>
            </thead>
            <tbody>
              ${qcAssemblies.map(assembly => {
                const lastRecord = assembly.lastRecord || {};
                const meta = parseFloat(assembly.porcentajeMeta || '97');
                const porcentaje = lastRecord.porcentajeObtenido || 0;
                const estado = lastRecord.estado || 'Pendiente';
                
                let porcentajeColor = '#ef4444';
                if (porcentaje >= meta) porcentajeColor = '#10b981';
                else if (porcentaje >= meta * 0.93) porcentajeColor = '#3b82f6';

                let estadoBg = '#f3f4f6', estadoColor = '#4b5563', estadoBorder = '#d1d5db';
                if (estado === 'OK') {
                  estadoBg = '#d1fae5'; estadoColor = '#065f46'; estadoBorder = '#6ee7b7';
                } else if (estado === 'NG') {
                  estadoBg = '#fee2e2'; estadoColor = '#991b1b'; estadoBorder = '#fca5a5';
                }

                return `
                  <tr style="background-color: ${qcAssemblies.indexOf(assembly) % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; width: 6%; overflow: hidden;">
                      <span style="display: inline-block; padding: 3px 7px; border-radius: 12px; font-size: 8px; font-weight: 700; background-color: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">QC</span>
                    </td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #111827; width: 9%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong style="font-size: 10px;">${assembly.maquina}</strong></td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #374151; width: 8%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px;">${assembly.modelo}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-family: monospace; width: 10%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px;">#${assembly.numero}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; width: 13%;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <strong style="color: ${porcentajeColor}; font-size: 11px; min-width: 35px;">${porcentaje}%</strong>
                        <div style="flex: 1; height: 8px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1); max-width: 60px;">
                          <div style="height: 100%; background: linear-gradient(to right, ${porcentajeColor}, ${porcentajeColor}); width: ${Math.min(porcentaje, 100)}%; transition: width 0.3s;"></div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; width: 8%; overflow: hidden;">
                      <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 8px; font-weight: 700; background-color: ${estadoBg}; color: ${estadoColor}; border: 1px solid ${estadoBorder}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${estado}</span>
                    </td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; width: 24%; font-size: 9px; color: #4b5563; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; max-height: 40px;">${lastRecord.comentarios || '<em style="color: #9ca3af;">Sin comentarios</em>'}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 9px; width: 11%; overflow: hidden; white-space: nowrap;">${assembly.fechaInicio || 'N/A'}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 700; font-size: 9px; width: 11%; overflow: hidden; white-space: nowrap;">${assembly.fechaDeadline || 'N/A'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const teachAssemblies = data.filter(a => a.tipo === 'TEACH');
    if (teachAssemblies.length > 0) {
      html += `
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; padding: 12px 16px; font-weight: bold; font-size: 15px; border-left: 5px solid #10b981; margin-bottom: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
            <span style="font-size: 18px; margin-right: 6px;">🎓</span>
            <span style="vertical-align: middle;">TEACH</span>
            <span style="background: rgba(255,255,255,0.7); color: #065f46; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 8px;">${teachAssemblies.length} ensambles</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); table-layout: fixed;">
            <thead>
              <tr style="background: linear-gradient(to bottom, #f9fafb, #f3f4f6);">
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 6%;">Tipo</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 10%;">Máquina</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 9%;">Modelo</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 10%;">Número</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 11%;">Jig 1 Mejora</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 11%;">Jig 2 Mejora</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 15%;">Test Destructivo</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 14%;">Inicio</th>
                <th style="color: #374151; text-align: left; padding: 10px 8px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; width: 14%;">Deadline</th>
              </tr>
            </thead>
            <tbody>
              ${teachAssemblies.map(assembly => {
                const lastRecord = assembly.lastRecord || {};
                
                const jig1 = lastRecord.mejoraPorcentajeJig1 
                  ? `${parseFloat(lastRecord.mejoraPorcentajeJig1) > 0 ? '↑' : '↓'} ${lastRecord.mejoraPorcentajeJig1}%`
                  : 'N/A';
                
                const jig2 = lastRecord.mejoraPorcentajeJig2 
                  ? `${parseFloat(lastRecord.mejoraPorcentajeJig2) > 0 ? '↑' : '↓'} ${lastRecord.mejoraPorcentajeJig2}%`
                  : 'N/A';

                const test1 = lastRecord.resultadoDestructivaJig1 
                  ? `<span style="display: inline-block; padding: 4px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; background-color: ${lastRecord.resultadoDestructivaJig1 === 'OK' ? '#d1fae5' : '#fee2e2'}; color: ${lastRecord.resultadoDestructivaJig1 === 'OK' ? '#065f46' : '#991b1b'}; border: 1px solid ${lastRecord.resultadoDestructivaJig1 === 'OK' ? '#6ee7b7' : '#fca5a5'}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">J1: ${lastRecord.resultadoDestructivaJig1}</span>`
                  : '';
                
                const test2 = lastRecord.resultadoDestructivaJig2 
                  ? `<span style="display: inline-block; padding: 4px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; background-color: ${lastRecord.resultadoDestructivaJig2 === 'OK' ? '#d1fae5' : '#fee2e2'}; color: ${lastRecord.resultadoDestructivaJig2 === 'OK' ? '#065f46' : '#991b1b'}; border: 1px solid ${lastRecord.resultadoDestructivaJig2 === 'OK' ? '#6ee7b7' : '#fca5a5'}; margin-left: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">J2: ${lastRecord.resultadoDestructivaJig2}</span>`
                  : '';

                const testResult = (test1 || test2) ? `${test1} ${test2}` : 'N/A';

                return `
                  <tr style="background-color: ${teachAssemblies.indexOf(assembly) % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; width: 6%; overflow: hidden;">
                      <span style="display: inline-block; padding: 3px 7px; border-radius: 12px; font-size: 8px; font-weight: 700; background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">TEACH</span>
                    </td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #111827; width: 10%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong style="font-size: 10px;">${assembly.maquina}</strong></td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #374151; width: 9%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px;">${assembly.modelo}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-family: monospace; width: 10%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px;">#${assembly.numero}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600; font-size: 10px; width: 11%; overflow: hidden; white-space: nowrap;">${jig1}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600; font-size: 10px; width: 11%; overflow: hidden; white-space: nowrap;">${jig2}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; width: 15%; overflow: hidden;">${testResult}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 9px; width: 14%; overflow: hidden; white-space: nowrap;">${assembly.fechaInicio || 'N/A'}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 700; font-size: 9px; width: 14%; overflow: hidden; white-space: nowrap;">${assembly.fechaDeadline || 'N/A'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    return html;
  };

  const generateEmailHTML = async () => {
    if (selectedAssemblies.length === 0) {
      alert('Por favor selecciona al menos un ensamble');
      return;
    }

    if (!emailRecipient || !emailRecipient.includes('@')) {
      alert('Por favor ingresa un correo válido');
      return;
    }

    const selectedData = assemblies.filter((a) =>
      selectedAssemblies.includes(a.id)
    );

    const subject = `Reporte de Ensambles TOPRE - ${new Date().toLocaleDateString('es-MX')}`;
    
    // Crear un resumen simple para el email
    const qcCount = selectedData.filter(a => a.tipo === 'QC').length;
    const teachCount = selectedData.filter(a => a.tipo === 'TEACH').length;
    
    const bodyText = `
Reporte de Ensambles - TOPRE
${'='.repeat(50)}

Fecha: ${new Date().toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}
Generado por: ${userProfile?.name || currentUser?.email || 'Usuario'}

Resumen:
- QC - Level Up: ${qcCount} ensambles
- TEACH: ${teachCount} ensambles
- Total: ${selectedData.length} ensambles

NOTA: Este es un resumen del reporte. Para ver el reporte completo con todos los detalles y formato profesional, por favor genera y descarga el PDF desde el sistema.

${'='.repeat(50)}
© 2025 Topre. Todos los derechos reservados.
Sistema de Control de Ingeniería v1.0 - ByUphy.mx
    `.trim();

    // Usar mailto para evitar problemas con URLs largas
    const mailtoLink = `mailto:${emailRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    
    // Abrir cliente de correo
    window.location.href = mailtoLink;
    
    alert('✅ Se ha abierto tu cliente de correo predeterminado.\n\nNOTA: El email contiene un resumen. Para enviar el reporte completo con formato, te recomendamos:\n1. Generar el PDF\n2. Adjuntarlo manualmente al correo');
    onClose();
  };

  const handleGenerate = () => {
    if (reportType === "pdf") {
      generatePDF();
    } else {
      generateEmailHTML();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-linear-to-r from-sky-50 to-blue-50">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 mr-2 text-sky-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              Generar Reporte de Ensambles
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Tipo de Reporte */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Reporte
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReportType("pdf")}
                  className={`p-4 border-2 rounded-lg transition ${
                    reportType === "pdf"
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`w-8 h-8 mx-auto mb-2 ${
                      reportType === "pdf" ? "text-sky-600" : "text-gray-400"
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <div
                    className={`text-sm font-semibold ${
                      reportType === "pdf" ? "text-sky-700" : "text-gray-600"
                    }`}
                  >
                    Descargar PDF
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Genera y descarga PDF automáticamente
                  </div>
                </button>

                <button
                  onClick={() => setReportType("email")}
                  className={`p-4 border-2 rounded-lg transition ${
                    reportType === "email"
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`w-8 h-8 mx-auto mb-2 ${
                      reportType === "email" ? "text-sky-600" : "text-gray-400"
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  <div
                    className={`text-sm font-semibold ${
                      reportType === "email" ? "text-sky-700" : "text-gray-600"
                    }`}
                  >
                    Enviar por Email
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Abre tu cliente de correo
                  </div>
                </button>
              </div>
            </div>

            {/* Campo de Email si es tipo email */}
            {reportType === 'email' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo del destinatario
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="ejemplo@hotmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            )}

            {/* Selección de Ensambles */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Seleccionar Ensambles ({selectedAssemblies.length}/
                  {assemblies.length})
                </label>
                <button
                  onClick={toggleAll}
                  className="text-sm text-sky-600 hover:text-sky-800 font-medium"
                >
                  {selectedAssemblies.length === assemblies.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {assemblies.map((assembly) => (
                  <label
                    key={assembly.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssemblies.includes(assembly.id)}
                      onChange={() => toggleAssembly(assembly.id)}
                      className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            assembly.tipo === "QC"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {assembly.tipo}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {assembly.maquina} / {assembly.modelo}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        #{assembly.numero}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-5 border-t border-gray-200 bg-gray-50 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-lg shadow-sm transition"
              disabled={isGenerating}
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </>
              ) : reportType === 'pdf' ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
                    />
                  </svg>
                  Generar PDF
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                  Enviar por Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
