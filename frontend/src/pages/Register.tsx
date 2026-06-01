import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { auth } from '../services/api';

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' }, { code: 'ES', name: 'España' },
  { code: 'MX', name: 'México' },   { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },    { code: 'PE', name: 'Perú' },
  { code: 'UY', name: 'Uruguay' },  { code: 'BR', name: 'Brasil' },
];

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', country: 'AR' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres');
    }
    setLoading(true);
    try {
      const { token, user } = await auth.register(form);
      localStorage.setItem('token', token);
      setUser(user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">♟</span>
          <h1 className="text-2xl font-bold mt-2">Crear cuenta</h1>
          <p className="text-gray-400 text-sm mt-1">Es gratis, siempre</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600/40 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="tu@email.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de usuario</label>
            <input type="text" value={form.username} onChange={set('username')} className="input" placeholder="jugador123" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" />
            <p className="text-xs text-gray-500 mt-1">Solo letras, números y guión bajo. 3-20 caracteres.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
            <input type="password" value={form.password} onChange={set('password')} className="input" placeholder="••••••••" required minLength={8} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">País</label>
            <select value={form.country} onChange={set('country')} className="input">
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-500 pt-2">
            Al registrarte aceptás los Términos de Servicio y confirmás tener 18 años o más.
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-chess-gold hover:underline">Ingresar</Link>
        </p>
      </div>
    </div>
  );
}
