import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-sky-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        
        {/* Logo/Encabezado */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">
            Topre
          </h1>
          <p className="text-sky-200 text-lg mt-2">Portal de Control de Mantenimiento</p>
        </div>

        {/* Tarjeta de Login */}
        <div className="bg-sky-800 p-8 rounded-xl shadow-2xl w-full">
          
          {!isLoading ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-2xl font-semibold text-center mb-6">Iniciar Sesión</h2>
              
              {/* Mensaje de Error */}
              {error && (
                <div className="p-3 bg-red-800 text-red-100 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {/* Campo de Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-sky-100 mb-2">
                  Correo Electrónico
                </label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-sky-950 border border-sky-700 rounded-md text-white placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="ingeniero@topre.com"
                />
              </div>
              
              {/* Campo de Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-sky-100 mb-2">
                  Contraseña
                </label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-sky-950 border border-sky-700 rounded-md text-white placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="••••••••"
                />
              </div>
              
              {/* Botón de Ingresar */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold p-3 rounded-md transition duration-300 ease-in-out shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ingresar
              </button>
            </form>
          ) : (
            <div className="text-center py-10">
              <svg 
                className="animate-spin h-8 w-8 text-white mx-auto" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sky-200 mt-4">Iniciando sesión...</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-sky-300 text-sm mt-6">
          © 2025 Topre. Todos los derechos reservados.
        </p>

      </div>
    </div>
  );
};

export default Login;
