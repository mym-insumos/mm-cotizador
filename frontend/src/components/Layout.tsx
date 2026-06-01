import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path: string) =>
    location.pathname === path ? 'text-chess-gold border-b-2 border-chess-gold' : 'text-gray-300 hover:text-white';

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-chess-panel border-b border-chess-accent/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">♟</span>
            <span className="font-bold text-xl text-chess-gold">ChessStake</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {user && (
              <>
                <Link to="/dashboard" className={`text-sm font-medium pb-0.5 ${isActive('/dashboard')}`}>
                  Panel
                </Link>
                <Link to="/matches" className={`text-sm font-medium pb-0.5 ${isActive('/matches')}`}>
                  Partidas
                </Link>
                <Link to="/tournaments" className={`text-sm font-medium pb-0.5 ${isActive('/tournaments')}`}>
                  Torneos
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-gray-400">{user.username}</span>
                  <span className="text-sm font-semibold text-chess-gold">
                    ${parseFloat(user.balance).toFixed(2)}
                  </span>
                </div>
                <Link to="/profile" className="w-8 h-8 rounded-full bg-chess-accent flex items-center justify-center text-sm font-bold hover:bg-chess-gold hover:text-chess-dark transition-colors">
                  {user.username[0].toUpperCase()}
                </Link>
                <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white transition-colors">
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-300 hover:text-white">
                  Ingresar
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-chess-panel border-t border-chess-accent/30 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
          <p>ChessStake — Plataforma de ajedrez competitivo basado en habilidad.</p>
          <p className="mt-1">Solo para mayores de 18 años. Juega con responsabilidad.</p>
        </div>
      </footer>
    </div>
  );
}
