import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const features = [
  {
    icon: '🛡',
    title: 'Sistema de Escrow',
    desc: 'Los fondos quedan bloqueados automáticamente antes de cada partida y se liberan al ganador verificado.',
  },
  {
    icon: '🔍',
    title: 'Anti-Cheat Integrado',
    desc: 'Análisis automático de correlación con motores. Partidas anuladas si se detecta uso de motor (≥95%).',
  },
  {
    icon: '⚡',
    title: 'Desconexión Segura',
    desc: '60 segundos de gracia para reconectarte. Si no, el rival gana por forfeit automático.',
  },
  {
    icon: '🏆',
    title: 'Torneos Sistema Suizo',
    desc: 'Torneos organizados con emparejamientos inteligentes. Premios distribuidos automáticamente.',
  },
  {
    icon: '✅',
    title: 'KYC / AML',
    desc: 'Verificación de identidad obligatoria para apuestas altas y retiros. Cumplimiento regulatorio.',
  },
  {
    icon: '💳',
    title: 'Pagos Seguros',
    desc: 'Depósitos y retiros vía Stripe. Comisiones reducidas con membresía Premium o High Stakes.',
  },
];

const plans = [
  {
    name: 'Free',
    price: 'Gratis',
    commission: '8%',
    maxStake: '$10',
    color: 'border-gray-600',
    badge: 'badge-free',
  },
  {
    name: 'Premium',
    price: '$15/mes',
    commission: '5%',
    maxStake: '$500',
    color: 'border-purple-500',
    badge: 'badge-premium',
    highlight: true,
  },
  {
    name: 'High Stakes',
    price: '$49/mes',
    commission: '3%',
    maxStake: '$5,000',
    color: 'border-chess-gold',
    badge: 'badge-high-stakes',
  },
];

export default function Home() {
  const user = useAuthStore(s => s.user);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-chess-panel to-chess-dark py-24 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-5 text-9xl flex items-center justify-center pointer-events-none">
          ♟♛♜♞♝
        </div>
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">
            Ajedrez competitivo.<br />
            <span className="text-chess-gold">Gana con habilidad.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            La plataforma de apuestas basadas en habilidad más completa para ajedrecistas.
            Partidas 1v1, torneos, anti-cheat y escrow automático.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link to="/matches" className="btn-primary text-base px-8 py-3">
                Jugar ahora
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-base px-8 py-3">
                  Crear cuenta gratis
                </Link>
                <Link to="/login" className="btn-secondary text-base px-8 py-3">
                  Ingresar
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Todo lo que necesitas para jugar con confianza
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card hover:border-chess-gold/30 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Elige tu plan</h2>
        <p className="text-center text-gray-400 mb-12">
          Más apuestas, menos comisión. Accede a partidas de mayor nivel.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card border-2 ${plan.color} ${plan.highlight ? 'scale-105 shadow-lg shadow-purple-900/30' : ''}`}
            >
              {plan.highlight && (
                <div className="text-center mb-3">
                  <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                    Más popular
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="text-2xl font-bold text-chess-gold mb-4">{plan.price}</div>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Comisión</span>
                  <span className="font-semibold">{plan.commission}</span>
                </div>
                <div className="flex justify-between">
                  <span>Apuesta máxima</span>
                  <span className="font-semibold">{plan.maxStake}</span>
                </div>
              </div>
              <Link to="/register" className={`mt-6 block text-center py-2 rounded-lg font-medium transition-colors ${plan.highlight ? 'btn-secondary' : 'bg-chess-accent/30 hover:bg-chess-accent text-white'}`}>
                Empezar
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Legal notice */}
      <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <div className="card border-yellow-600/20 text-sm text-gray-400">
          <p className="font-semibold text-yellow-400 mb-2">Aviso Legal</p>
          <p>
            ChessStake opera como plataforma de <strong>juegos basados en habilidad</strong> (skill-based gaming),
            no como casa de apuestas de azar. El ajedrez es un juego de habilidad pura.
            La plataforma cumple con requisitos KYC/AML. Disponible solo para mayores de 18 años
            en jurisdicciones donde sea legal. Verifica la legislación de tu país antes de participar.
          </p>
        </div>
      </section>
    </div>
  );
}
