import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

const HotPressModal = ({ isOpen, onClose, onSubmit, userName }) => {
  const getDefaultDeadline = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    maquina: '',
    modelo: '',
    numero: '',
    tipo: 'QC',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaDeadline: getDefaultDeadline(),
    porcentajeMeta: '97'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      maquina: '',
      modelo: '',
      numero: '',
      tipo: 'QC',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaDeadline: getDefaultDeadline(),
      porcentajeMeta: '97'
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        {/* Modal Container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                <form onSubmit={handleSubmit}>
                  {/* Modal Header */}
                  <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <Dialog.Title className="text-xl font-semibold text-gray-900">
                      REGISTRAR AJUSTE EN HOT PRESS
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Form Body */}
                  <div className="p-6 space-y-4">
                    {/* Tipo de Ajuste */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Ajuste
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, tipo: 'QC' }))}
                          className={`py-2 px-4 rounded-md font-medium text-sm border transition-all ${
                            formData.tipo === 'QC'
                              ? 'bg-sky-100 border-sky-500 text-sky-800'
                              : 'bg-gray-50 border-gray-300 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          QC - Level Up
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, tipo: 'LASER' }))}
                          className={`py-2 px-4 rounded-md font-medium text-sm border transition-all ${
                            formData.tipo === 'LASER'
                              ? 'bg-sky-100 border-sky-500 text-sky-800'
                              : 'bg-gray-50 border-gray-300 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          Ajuste en Laser
                        </button>
                      </div>
                    </div>

                    {/* Row 1: Maquina y Modelo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="maquina" className="block text-sm font-medium text-gray-700 mb-1">
                          Máquina
                        </label>
                        <input
                          type="text"
                          name="maquina"
                          id="maquina"
                          required
                          value={formData.maquina}
                          onChange={handleChange}
                          placeholder="Ej: LL58-Y6P"
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1">
                          Modelo
                        </label>
                        <input
                          type="text"
                          name="modelo"
                          id="modelo"
                          required
                          value={formData.modelo}
                          onChange={handleChange}
                          placeholder="Ej: H60E"
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* Row 2: Numero */}
                    <div>
                      <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Parte
                      </label>
                      <input
                        type="text"
                        name="numero"
                        id="numero"
                        required
                        value={formData.numero}
                        onChange={handleChange}
                        placeholder="Ej: 63210/610-3W0-A000-H1"
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>

                    {/* Row 3: Fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Inicio
                        </label>
                        <input
                          type="date"
                          name="fechaInicio"
                          id="fechaInicio"
                          required
                          value={formData.fechaInicio}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="fechaDeadline" className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha Límite
                        </label>
                        <input
                          type="date"
                          name="fechaDeadline"
                          id="fechaDeadline"
                          required
                          value={formData.fechaDeadline}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* Row 4: Porcentaje Meta - solo para QC */}
                    {formData.tipo === 'QC' && (
                      <div>
                        <label htmlFor="porcentajeMeta" className="block text-sm font-medium text-gray-700 mb-1">
                          Porcentaje Meta
                        </label>
                        <input
                          type="number"
                          name="porcentajeMeta"
                          id="porcentajeMeta"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.porcentajeMeta}
                          onChange={handleChange}
                          placeholder="97"
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">Porcentaje objetivo a alcanzar</p>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end p-5 border-t border-gray-200 space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="bg-white hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-lg shadow-sm transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition"
                    >
                      Registrar Ajuste
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default HotPressModal;
