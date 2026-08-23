# SpendWise AI — Know Where Your Money Goes

A modern, AI-powered personal finance tracker web application built with Next.js, TypeScript, MongoDB, and Tailwind CSS.

## 🎯 Problem Statement

> "People struggle to track where their money goes each month because transactions are scattered across UPI apps, bank cards, wallets, subscriptions, and cash, with no single simple view of everyday expenses in plain language."

SpendWise AI provides **one simple dashboard** where users can understand their income, spending, subscriptions, budgets, savings, and financial habits — explained in plain English.

## ✨ Features

### Core Features
- **Dashboard** — Money snapshot with balance, income, expenses, savings rate, and AI monthly summary
- **Transactions** — Full CRUD with search, filter (category, type, payment method), and date range
- **Budget Management** — Set spending limits per category with progress bars and alerts
- **Savings Goals** — Track progress towards financial goals with visual indicators
- **Subscription Tracker** — Monitor recurring expenses with renewal reminders
- **Analytics & Reports** — Interactive charts (bar, pie, line) with CSV export
- **AI Insights** — Plain-English spending analysis and saving suggestions
- **CSV Import** — Auto-detect columns, categorize transactions, detect duplicates

### Platform Features
- **Authentication** — Email/password registration and login with JWT
- **Onboarding** — 5-step guided setup for new users
- **Notifications** — Budget warnings, subscription reminders, spending alerts, savings milestones
- **Admin Dashboard** — Platform stats, user management, top categories
- **Responsive Design** — Desktop sidebar + mobile bottom navigation
- **Data Export** — CSV export of all transactions
- **Settings** — Profile management, notification preferences, data privacy

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Next.js 16, TypeScript, Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| State | Zustand |
| Notifications | React Hot Toast |
| Backend | Next.js API Routes (REST) |
| Database | MongoDB with Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |

## 📁 Project Structure

```
spendwise-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, Register, Forgot Password
│   │   ├── (dashboard)/     # Dashboard, Transactions, Budgets, Goals, etc.
│   │   ├── api/             # REST API routes
│   │   │   ├── auth/        # Register, Login, Logout, Me
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── goals/
│   │   │   ├── subscriptions/
│   │   │   ├── insights/
│   │   │   ├── notifications/
│   │   │   ├── accounts/
│   │   │   ├── csv-import/
│   │   │   └── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx         # Landing page
│   ├── components/
│   │   ├── ui/              # Button, Card, Modal, Input, Badge, ProgressBar
│   │   └── layout/          # Sidebar, MobileNav, Header
│   ├── lib/                 # db.ts, auth.ts, utils.ts
│   ├── models/              # Mongoose schemas
│   ├── hooks/               # useApi
│   ├── store/               # Zustand store
│   └── types/               # TypeScript interfaces
└── .env.example
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone and Install

```bash
cd spendwise-ai
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
MONGODB_URI=mongodb://localhost:27017/spendwise
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas — just update MONGODB_URI in .env
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Create Account

1. Click "Get Started Free" on the landing page
2. Register with email and password
3. Complete the onboarding flow
4. Start adding transactions!

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List (supports search, filter, pagination) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets` | List budgets |
| POST | `/api/budgets` | Create budget |
| PUT | `/api/budgets/:id` | Update budget |
| DELETE | `/api/budgets/:id` | Delete budget |

### Savings Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal (including deposits) |
| DELETE | `/api/goals/:id` | Delete goal |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions` | List subscriptions |
| POST | `/api/subscriptions` | Add subscription |
| PUT | `/api/subscriptions/:id` | Update subscription |
| DELETE | `/api/subscriptions/:id` | Delete subscription |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insights` | Generate AI insights |
| POST | `/api/csv-import` | Import CSV file |
| GET/POST/PUT | `/api/notifications` | Manage notifications |
| GET/POST | `/api/accounts` | Manage accounts |
| GET | `/api/admin/stats` | Admin platform stats |

## 🔒 Security

- Passwords hashed with bcrypt (12 rounds)
- JWT-based authentication with 7-day expiry
- HTTP-only cookies for session management
- User data isolation (all queries filtered by userId)
- Input validation on all API endpoints
- No sensitive financial data (PINs, CVVs) ever stored
- CSRF-safe architecture with SameSite cookies

## 🏗 Production Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Use MongoDB Atlas for database
5. Deploy

```bash
# Build
npm run build

# Start
npm start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Database Schemas

- **User** — name, email, passwordHash, role, currency, notificationPreferences
- **Account** — userId, accountName, accountType, balance, institution
- **Transaction** — userId, merchant, amount, type, category, paymentMethod, date
- **Budget** — userId, category, amount, period
- **SavingsGoal** — userId, name, targetAmount, currentAmount, targetDate
- **Subscription** — userId, name, amount, billingCycle, renewalDate
- **Notification** — userId, title, message, type, read

## ⚠️ Disclaimer

SpendWise AI provides personal budgeting and financial education tools. It does not provide personalized investment, tax, or financial advice.

---

Built with ❤️ by the SpendWise AI team.
