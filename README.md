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

Choose how data is persisted via `STORAGE_TYPE` environment variable:

| Option | Value | Description |
|--------|-------|-------------|
| **JSON File** (default) | `json-file` | Saves to `./data/expenses.json` — simple, portable, human-readable |
| **SQLite** | `sqlite` | Saves to `./data/expenses.db` — better for larger datasets and queries |
| **Memory** | `memory` | In-memory only — data lost on restart (good for demos/testing) |

Copy `.env.example` to `.env` and set your preference:

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
| `STORAGE_TYPE` | `json-file` | `memory`, `json-file`, or `sqlite` |
| `DATA_DIR` | `./data` | Directory for JSON/SQLite files |
| `PORT` | `3000` | HTTP server port |

## Production

```bash
npm run build
STORAGE_TYPE=sqlite npm run start:prod
```
