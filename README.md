# Accora Core

> **Brand:** Accora Core  
> **Tagline:** Your Business, With Intelligence  
> **Supporting Statement:** Understand your numbers. Predict your future. Act with confidence.

Accora Core is a complete, production-minded AI Financial Copilot tailored for small businesses, online sellers, agencies, and freelancers. It turns raw financial transactions into actionable business intelligence, detects potential financial risks, forecasts multi-month cash flow, simulates what-if scenarios, and delivers data-backed strategic moves.

---

## Key Capabilities & Features

* **Multi-Tenant Workspace Isolation:** Every transaction, invoice, report, notification, and setting is strictly scoped by workspace ID.
* **Dual-Mode AI Engine:** Ships with a powerful, deterministic offline financial intelligence engine active by default. No external API keys, internet connectivity, or paid credit cards are required. Optionally bridges to external LLMs if configured.
* **Onboarding & Baseline Setup:** 3-step wizard capturing core business identity, opening cash reserves, fixed/variable expense baselines, and loan obligations.
* **Transactions & CSV Batch Import:** Full CRUD, multi-criteria filtering, search, categorization, and automated duplicate prevention during bulk CSV imports.
* **Invoices & Receivables Management:** Line-item calculations, automated tax computation, payment status tracking, and strict separation preventing double-counting in accounting revenue.
* **Dashboard & Transparent Health Scoring:** Real-time revenue, expense, margin, and cash-flow analytics paired with an interpretable 0–100 Business Health Score explaining contributing factors.
* **Predictive Forecasting & What-If Scenarios:** 3-month predictive cash flow, revenue, and expense forecasting with upper/lower confidence bounds, plus scenario simulations (e.g. revenue shifts, salary expenses, churn).
* **Financial Reports & Exports:** Reconciled Profit & Loss (P&L), Expense Category Breakdown, Cash Flow Statement, and AI Executive Summary with date-range filtering, CSV file downloads, and clean print/PDF layouts.
* **Notifications Center:** Automated risk evaluation detecting overdue invoices, low cash runway (< 1.5 months), and expense spikes (> 20%), backed by deterministic fingerprint deduplication.
* **Workspace Settings & Triple Theme System:** Edit business profiles, tax rates, and currencies. Seamless switching across **Light**, **Dark**, and **High Contrast** themes with persistent local and cloud storage.

---

## Architecture Overview

```text
accora core/
├── backend/
│   ├── app/
│   │   ├── ai/                # AI Copilot engine (rules-based heuristics + LLM bridge)
│   │   ├── analytics/         # Financial formulas, forecasting & health scoring
│   │   ├── api/v1/endpoints/  # FastAPI REST controllers (Auth, Invoices, Txns, etc.)
│   │   ├── core/              # Config, database connection, security (JWT & bcrypt)
│   │   ├── models/            # SQLAlchemy 2.0 ORM models (SQLite foreign keys & WAL)
│   │   ├── schemas/           # Pydantic v2 data validation schemas
│   │   ├── services/          # Business logic services (Notifications, Reports)
│   │   └── main.py            # FastAPI application entrypoint
│   ├── migrations/            # Alembic schema migrations (001, 002, 003)
│   ├── tests/                 # 45 automated unit, integration, and E2E tests
│   ├── accora_core.db         # Persistent SQLite database
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Safe template for environment configuration
│   └── .env                   # Local configuration
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI cards, tables, modal wizards, navigation
│   │   ├── context/           # AuthContext (JWT session & workspace state)
│   │   ├── pages/             # Landing, Auth, Dashboard, Invoices, Reports, etc.
│   │   ├── services/          # Axios API service client
│   │   └── types/             # TypeScript definitions
│   ├── package.json           # Node dependencies
│   └── vite.config.ts         # Vite bundler with API proxy to port 8000
├── run_backend.ps1            # Windows PowerShell launch script (Backend)
├── run_frontend.ps1           # Windows PowerShell launch script (Frontend)
├── .gitignore                 # Version control exclusions
└── README.md
```

---

## Prerequisites

* **Operating System:** Windows 10/11 (or macOS / Linux)
* **Python:** 3.11, 3.12, or 3.13
* **Node.js:** 18.x or 20.x LTS
* **Package Managers:** `pip` and `npm`

---

## Windows PowerShell Quickstart Guide

To run Accora Core locally on Windows, open **two PowerShell terminals**:

### Terminal 1: Backend Server (FastAPI)

```powershell
# Navigate to the project root
cd "c:\Users\ADMIN\Downloads\accora core"

# Launch backend via the provided PowerShell script
.\run_backend.ps1
```

*Or manually:*
```powershell
# Create virtual environment (if not already created)
python -m venv backend\venv

# Run FastAPI backend using uvicorn
& ".\backend\venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir ".\backend" --host 127.0.0.1 --port 8000 --reload
```

* Backend Root: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* Interactive Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Health Check Endpoint: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

### Terminal 2: Frontend Web App (Vite + React)

```powershell
# Navigate to the project root
cd "c:\Users\ADMIN\Downloads\accora core"

# Launch frontend via the provided PowerShell script
.\run_frontend.ps1
```

*Or manually:*
```powershell
cd frontend
cmd /c "npm run dev"
```

* Web Application: [http://localhost:5173](http://localhost:5173)

---

## Demo Account Credentials

Accora Core includes a pre-seeded, production-realistic demo account for instant evaluation without manual data entry:

* **Demo Button:** Click **"Explore Demo"** on the landing page or login screen.
* **Email:** `demo@accora.ai`
* **Password:** `DemoPass123!`
* **Pre-seeded Business:** Lumina Fashion (E-commerce / Retail with transactions, multi-tier invoices, cash runway indicators, and health scores).

---

## Database & Schema Migrations

Accora Core uses SQLite with Write-Ahead Logging (`WAL`) mode and explicit foreign key constraints. The database file is located at `backend/accora_core.db`.

To inspect or run migrations using Alembic:

```powershell
cd "c:\Users\ADMIN\Downloads\accora core"

# Check migration status
& ".\backend\venv\Scripts\alembic.exe" -c backend\alembic.ini current

# Apply pending migrations
& ".\backend\venv\Scripts\alembic.exe" -c backend\alembic.ini upgrade head
```

---

## Environment Variables & Configuration

Backend settings are configured in `backend/.env` (see `backend/.env.example`):

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `Accora Core` | Application name displayed in API responses |
| `ENVIRONMENT` | `development` | Runtime environment (`development` or `production`) |
| `SECRET_KEY` | *(dev key)* | Secret key for signing JWT tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT token validity window (24 hours) |
| `DATABASE_URL` | `sqlite:///./accora_core.db` | Auto-anchors to `backend/accora_core.db` |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins for frontend requests |
| `AI_PROVIDER` | `none` | `none` (default rules-based copilot) or `openai`/`gemini` |
| `AI_PROVIDER_API_KEY` | `""` | Optional external API key; app is 100% functional without it |

---

## Verification & Automated Testing

### 1. Backend Test Suite (Pytest)
Runs 45 unit, integration, and E2E user-journey tests verifying authentication, workspace tenancy, transaction deduplication, invoice arithmetic, AI heuristics, reports filtering, and notification deduplication:

```powershell
cd "c:\Users\ADMIN\Downloads\accora core"
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest backend\tests -v
```

### 2. Frontend Production Build Check
Validates strict TypeScript types, JSX compilation, and Vite asset bundling:

```powershell
cd "c:\Users\ADMIN\Downloads\accora core\frontend"
cmd /c "npm run build"
```

---

## Export Limitations & Print Workflow

* **CSV Export:** Generated in-memory on the client from currently active query filters and dates, prompting an immediate `.csv` file download.
* **PDF / Print Export:** Clean `@media print` stylesheet isolates statement headers, tabular figures, and summary cards while stripping sidebar navigation and web-only controls for browser-native Save-as-PDF or printing.
