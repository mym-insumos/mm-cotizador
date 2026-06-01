# ChessStake — Plataforma de Ajedrez Competitivo con Apuestas

Plataforma de **skill-based gaming** para ajedrez. Partidas 1v1 y torneos con sistema de escrow automático, anti-cheat integrado, cumplimiento KYC/AML y distribución automática de premios.

## Arquitectura

```
mm-cotizador/
├── backend/              # Node.js + Express + Prisma + Socket.io
│   ├── prisma/           # Schema PostgreSQL + seed
│   └── src/
│       ├── controllers/  # Lógica de negocio por recurso
│       ├── services/     # Escrow, Lichess API, Anti-cheat, Torneos
│       ├── routes/       # Express routers
│       ├── middleware/   # Auth JWT, KYC, rate limiting
│       └── utils/        # Logger, Prisma client, algoritmos de distribución
└── frontend/             # React + TypeScript + Vite + Tailwind
    └── src/
        ├── pages/        # Home, Dashboard, Matches, Tournaments, Profile
        ├── components/   # Layout, MatchCard, TournamentCard, KYCBanner
        ├── services/     # API client (Axios)
        ├── store/        # Zustand (auth state)
        └── types/        # TypeScript interfaces
```

## Funcionalidades principales

### Ciclo de vida de una partida (Match)
1. **Creación**: Jugador 1 crea partida con apuesta → fondos bloqueados en escrow
2. **Unión**: Jugador 2 se une → fondos bloqueados → partida ACTIVE
3. **Juego**: En Lichess (enlace generado)
4. **Liquidación**: Se envía el gameId → sistema verifica resultado vía API de Lichess
5. **Distribución**: Ganador recibe pozo - comisión. Tablas = devolución - 2%

### Anti-Cheat
- Análisis de correlación con motor (Lichess Cloud Eval)
- Umbral: ≥95% de movimientos == motor → partida VOID + devolución
- Patrones adicionales: ACPL < 5, desviación estándar mínima

### Sistema de Escrow
- Fondos se mueven de `balance` → `lockedBalance` al apostar
- Release automático al ganador con comisión descontada
- Devolución total en cancelaciones / errores técnicos

### Torneos
- Sistema Suizo con emparejamiento inteligente (evita rematches)
- Distribución de premios configurable por torneo
- Cierre automático con ranking final

### Planes y comisiones
| Plan        | Comisión | Apuesta máx. | Precio   |
|-------------|----------|--------------|----------|
| Free        | 8%       | $10          | Gratis   |
| Premium     | 5%       | $500         | $15/mes  |
| High Stakes | 3%       | $5,000       | $49/mes  |

### KYC / AML
- Verificación obligatoria para apuestas > $50 y retiros
- Tipos: DNI, Pasaporte, Cédula, Licencia
- Proceso de revisión manual vía panel admin

## Setup local

### Requisitos
- Node.js 18+
- Docker + Docker Compose
- Cuenta Lichess (para token API)
- Cuenta Stripe (para pagos)

### Iniciar con Docker
```bash
docker-compose up -d
```

### Iniciar manualmente

**Backend:**
```bash
cd backend
cp .env.example .env
# Editar .env con tus claves
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Variables de entorno requeridas

Ver `backend/.env.example` para la lista completa.

Claves mínimas:
- `DATABASE_URL` — PostgreSQL
- `JWT_SECRET` — Clave secreta para tokens
- `STRIPE_SECRET_KEY` — Procesamiento de pagos
- `STRIPE_WEBHOOK_SECRET` — Webhook de Stripe
- `LICHESS_TOKEN` — API token de Lichess

## API Reference

### Auth
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
POST /api/auth/link-chess
```

### Matches
```
GET  /api/matches              # Partidas abiertas
GET  /api/matches/my           # Mis partidas
POST /api/matches              # Crear partida
POST /api/matches/:id/join     # Unirse a partida
POST /api/matches/:id/settle   # Liquidar (enviar gameId)
POST /api/matches/:id/cancel   # Cancelar
POST /api/matches/:id/dispute  # Disputar
```

### Tournaments
```
GET  /api/tournaments
GET  /api/tournaments/:id
GET  /api/tournaments/:id/standings
POST /api/tournaments/:id/register
```

### Payments
```
GET  /api/payments/balance
GET  /api/payments/transactions
POST /api/payments/deposit
POST /api/payments/withdraw
POST /api/payments/subscribe
POST /api/payments/webhook  (Stripe)
```

### KYC
```
GET  /api/kyc/status
POST /api/kyc/submit
```

## Consideraciones legales

- Operar como **skill-based gaming** (no casino/azar)
- Registrar como empresa de eSports o entretenimiento competitivo
- Aplicar KYC/AML según normativa local (Argentina: UIF, BCRA)
- Bloquear acceso desde jurisdicciones prohibidas (EE.UU. varios estados, China)
- Edad mínima: 18 años (verificar con fecha de nacimiento en KYC)
- Todos los movimientos de fondos registrados para auditoría

## Stack tecnológico

**Backend:** Node.js, Express, Prisma ORM, PostgreSQL, Socket.io, Stripe, JWT, Winston  
**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, Axios  
**Infraestructura:** Docker, Docker Compose, Redis (opcional para sesiones)
