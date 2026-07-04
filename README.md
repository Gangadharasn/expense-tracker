# Expense Tracker

A full-stack **NestJS** expense tracker with a responsive web UI for **mobile and desktop**. Track expenses, deposits, withdrawals, transfers, and savings — organized month-wise with reports and business insights.

## Features

- **Transaction types**: Expense, Deposit, Withdrawal, Transfer, Saving
- **Month-wise filtering** with prev/next navigation
- **Dashboard** with income, expense, savings, and net balance
- **Insights engine**: savings rate alerts, spending trends, top categories, deficit warnings
- **Reports**: monthly summary, year-to-date, daily trend charts
- **Multi-account** support (Cash, Bank, Savings, Wallet)
- **Responsive UI** — mobile-first bottom navigation, desktop-friendly layout

## Storage Options

| Option | When used | Description |
|--------|-----------|-------------|
| **MongoDB Atlas** (recommended for Vercel) | `MONGODB_URI` is set | Cloud database — data persists across deploys |
| **JSON File** (local default) | Local, no Mongo URI | `./data/expenses.json` |
| **SQLite** | `STORAGE_TYPE=sqlite` | `./data/expenses.db` |
| **Memory** | Vercel without `MONGODB_URI` | Temporary — lost on restart |

If `MONGODB_URI` is set, MongoDB is used automatically (local and Vercel).

### MongoDB Atlas setup (free tier)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a **free M0 cluster**
3. **Database Access** → Add user (username + password)
4. **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere — needed for Vercel)
5. **Connect** → Drivers → copy connection string:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `USER` and `PASSWORD` with your database user

**Local:** add to `.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Vercel:** Project → Settings → Environment Variables → add `MONGODB_URI` with the same value → Redeploy

Data is stored in database `expense_tracker`, collection `appdata`.

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

## Quick Start

```bash
cd expense-tracker
npm install
npm run start:dev
```

Open **http://localhost:3000** in your browser (works on phone and desktop).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + storage info |
| GET | `/api/transactions` | List transactions (`?month=&year=&type=`) |
| POST | `/api/transactions` | Create transaction |
| PATCH | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts` | Create account |
| GET | `/api/categories` | List categories (`?type=`) |
| GET | `/api/reports/dashboard` | Dashboard with insights |
| GET | `/api/reports/monthly` | Monthly summary |
| GET | `/api/reports/year` | Full year overview |

## Project Structure

```
expense-tracker/
├── src/
│   ├── storage/          # Pluggable storage (memory, JSON, SQLite)
│   ├── transactions/     # CRUD + balance updates
│   ├── accounts/         # Account management
│   ├── categories/       # Expense categories
│   ├── reports/          # Insights & analytics
│   └── data/             # Data access layer
├── public/               # Responsive web frontend
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── data/                 # Persisted data (created at runtime)
```

## Scripts

```bash
npm run start:dev    # Development with hot reload
npm run build        # Production build
npm run start:prod   # Run production build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | — | MongoDB Atlas connection string (auto-enables MongoDB) |
| `STORAGE_TYPE` | `json-file` | `memory`, `json-file`, or `sqlite` (ignored if `MONGODB_URI` set) |
| `DATA_DIR` | `./data` | Directory for JSON/SQLite files (local only) |
| `PORT` | `3000` | HTTP server port |

## Production

```bash
npm run build
# With MongoDB Atlas:
MONGODB_URI="mongodb+srv://..." npm run start:prod
```
