# IPAK Data Pulse — Full Stack Rewrite

## Tech Stack

### Backend (NestJS)
| Component | Technology |
|---|---|
| **Framework** | NestJS 10 |
| **Database** | PostgreSQL 14+ |
| **ORM** | Prisma 5.19 |
| **Auth** | JWT (Access + Refresh Tokens) |
| **Password** | bcrypt |
| **IDs** | UUID v4 |
| **Language** | TypeScript |

### Frontend (Flutter)
| Component | Technology |
|---|---|
| **Framework** | Flutter 3.x |
| **Language** | Dart |
| **State** | Provider |
| **HTTP** | http package |
| **Charts** | fl_chart |
| **Storage** | shared_preferences |
| **Theme** | Material 3 (Light + Dark) |

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── main.ts              # App entry
│   ├── app.module.ts        # Root module
│   ├── auth/                # JWT + Refresh + bcrypt
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/jwt.strategy.ts
│   │   └── guards/jwt-auth.guard.ts
│   ├── production/          # Production CRUD
│   ├── dispatch/            # Dispatch CRUD
│   ├── packing/             # Packing CRUD
│   ├── analytics/           # Analytics + Targets
│   ├── admin/               # Users, Machines, Products, Customers
│   └── prisma/              # Prisma service
├── package.json
├── tsconfig.json
└── .env

flutter_app/
├── lib/
│   ├── main.dart            # App entry
│   ├── theme/app_theme.dart # Light + Dark themes
│   ├── services/api_service.dart  # API client
│   └── screens/
│       ├── login_screen.dart
│       ├── home_screen.dart
│       ├── dashboard_screen.dart
│       ├── production_screen.dart
│       ├── dispatch_screen.dart
│       ├── dispatch_report_screen.dart
│       ├── packing_screen.dart
│       ├── analytics_screen.dart
│       └── admin_screen.dart
└── pubspec.yaml
```

---

## Getting Started

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

### Frontend (Flutter)

```bash
cd flutter_app
flutter pub get
flutter run
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT + Refresh) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout (invalidate refresh) |
| GET | `/api/auth/me` | Get current user profile |

### Production
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/production?plant=X` | List entries |
| POST | `/api/production` | Create entry |
| PUT | `/api/production/:id` | Update entry |
| DELETE | `/api/production/:id` | Soft-delete entry |
| POST | `/api/production/bulk-approve` | Bulk approve/reject |

### Dispatch
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dispatch?plant=X` | List dispatches |
| GET | `/api/dispatch/kpis?plant=X` | Dispatch KPIs |
| POST | `/api/dispatch` | Create dispatch (auto Dispatch No.) |
| PUT | `/api/dispatch/:id` | Update dispatch |
| DELETE | `/api/dispatch/:id` | Soft-delete dispatch |

### Packing
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/packing?plant=X` | List packing records |
| POST | `/api/packing` | Create (auto # of packs) |
| PUT | `/api/packing/:id` | Update record |
| DELETE | `/api/packing/:id` | Soft-delete record |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/production` | Production analytics |
| GET | `/api/analytics/metallizer` | Metallizer analytics |
| GET | `/api/analytics/target-machines` | Target achievement |
| GET | `/api/analytics/targets` | List targets |
| POST | `/api/analytics/targets` | Create target |
| PUT | `/api/analytics/targets/:id` | Update target |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/machines` | List machines |
| POST/PUT/DELETE | `/api/admin/machines/:id` | CRUD machines |
| GET | `/api/admin/products` | List products |
| POST/PUT/DELETE | `/api/admin/products/:id` | CRUD products |
| GET | `/api/admin/customers` | List customers |
| POST/PUT/DELETE | `/api/admin/customers/:id` | CRUD customers |

---

## Default Credentials

| Email | Password | Role |
|---|---|---|
| admin@ipak.com | admin123 | Admin |

---

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ipak_data_pulse"
JWT_SECRET="change-in-production"
PORT=3001
CORS_ORIGIN=*
```
