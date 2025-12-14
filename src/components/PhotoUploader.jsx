import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * PhotoUploader - Componente reutilizable para subir fotos a Firebase Storage
 * @param {string} userId - ID del usuario actual
 * @param {string} assemblyId - ID del assembly
 * @param {array} photos - Array de objetos {url, path, name}
 * @param {function} onPhotosChange - Callback cuando cambian las fotos
 * @param {boolean} disabled - Si está deshabilitado
 */
const PhotoUploader = ({ userId, assemblyId, photos = [], onPhotosChange, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Comprimir imagen al 50% de calidad
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Mantener proporciones pero limitar tamaño máximo
        const maxSize = 1920;
        let { width, height } = img;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con 50% de calidad
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.5);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const newPhotos = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Solo aceptar imágenes
      if (!file.type.startsWith('image/')) {
        continue;
      }

      // Validar tamaño máximo de 2MB
      const maxSizeMB = 2;
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`La imagen "${file.name}" excede el tamaño máximo de ${maxSizeMB}MB`);
        continue;
      }

      try {
        // Comprimir imagen
        const compressedBlob = await compressImage(file);
        
        // Generar nombre único
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storagePath = `users/${userId}/assemblies/${assemblyId}/${fileName}`;
        
        // Subir a Firebase Storage
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, compressedBlob);
        
        // Obtener URL de descarga
        const downloadURL = await getDownloadURL(storageRef);
        
        newPhotos.push({
          url: downloadURL,
          path: storagePath,
          name: file.name
        });
        
        // Actualizar progreso
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (error) {
        console.error('Error subiendo foto:', error);
      }
    }

    // Agregar nuevas fotos al array existente
    onPhotosChange([...photos, ...newPhotos]);
    
    setUploading(false);
    setUploadProgress(0);
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (index) => {
    const photo = photos[index];
    
    try {
      // Eliminar de Firebase Storage
      const storageRef = ref(storage, photo.path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error eliminando foto:', error);
      // Continuar aunque falle la eliminación del storage
    }
    
    // Remover del array
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Evidencia Fotográfica
      </label>
      
      {/* Área de carga */}
      <div 
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          disabled || uploading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-sky-400 hover:bg-sky-50 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin mx-auto h-8 w-8 border-2 border-sky-600 border-t-transparent rounded-full"></div>
            <p className="text-sm text-gray-600">Subiendo fotos... {uploadProgress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-sky-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-10 w-10 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-sky-600">Toca para subir fotos</span>
            </p>
            <p className="text-xs text-gray-500">PNG, JPG hasta 2MB cada una</p>
          </>
        )}
      </div>

      {/* Vista previa de fotos */}
      {photos.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">{photos.length} foto(s) cargada(s)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img 
                  src={photo.url} 
                  alt={photo.name || `Foto ${index + 1}`}
                  className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(index);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
