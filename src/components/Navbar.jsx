import { useAuth } from '../contexts/AuthContext';
import Logo from '../assets/logo.png';

const Navbar = () => {
  const { userProfile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <img src={Logo} alt="Topre Logo" className="h-9 w-auto" />
            <span className="ml-5 text-gray-500 font-medium">Portal de Ingenieria</span>
          </div>
          
          {/* User Info */}
          <div className="flex items-center">
            <span className="text-gray-700 mr-3">
              Hola, <span className="font-medium">{userProfile?.name || 'Usuario'}</span>
            </span>
            {/* User Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <button
              onClick={handleLogout}
              className="ml-4 text-sm font-medium text-gray-600 hover:text-sky-700 transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
