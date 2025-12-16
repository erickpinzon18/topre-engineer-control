import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';

const Navbar = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="shrink-0 flex items-center">
            {/* <img src={Logo} alt="Topre Logo" className="h-7 sm:h-9 w-auto" /> */}
            <span className="ml-2 sm:ml-5 text-gray-500 font-medium text-sm sm:text-base hidden xs:inline">
              Portal de Ingeniería
            </span>
          </div>
          
          {/* User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Reuniones Button */}
            <button
              onClick={() => navigate('/meetings')}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span className="hidden sm:inline">Reuniones</span>
            </button>

            {/* Nombre de usuario - solo desktop */}
            <span className="text-gray-700 text-sm hidden sm:inline">
              Hola, <span className="font-medium">{userProfile?.name || 'Usuario'}</span>
            </span>
            
            {/* User Icon */}
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {/* Nombre solo móvil */}
              <span className="ml-1.5 text-gray-700 text-sm font-medium sm:hidden">
                {userProfile?.name?.split(' ')[0] || 'Usuario'}
              </span>
            </div>
            
            {/* Botón cerrar sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-sky-700 transition bg-gray-50 sm:bg-transparent px-2.5 py-1.5 sm:px-0 sm:py-0 rounded-lg sm:rounded-none"
            >
              {/* Icono de salida - solo móvil */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:hidden">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
