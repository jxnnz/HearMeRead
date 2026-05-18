# HearMeRead — Backend API

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2 (async) |
| Database | PostgreSQL (via asyncpg) |
| Migrations | Alembic |
| Auth | PyJWT + passlib/bcrypt |
| ASR | Groq Cloud API (whisper-large-v3) |
| Storage | Cloudflare R2 (via boto3) |
| Email | Resend |
| Encryption | cryptography (Fernet) |
| Task Scheduling | APScheduler |

---

## Prerequisites

- Python 3.11+
- PostgreSQL database (local or cloud — Supabase works)
- A Groq API key (free tier available at console.groq.com)
- A Cloudflare R2 bucket (for audio storage)
- A Resend account (for transactional email)

---

## Local Setup

### 1. Create and activate a virtual environment

```bash
python -m venv venv
```

**Windows (PowerShell):**
```powershell
venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the `Backend/` directory:

```env
# Database
# For local PostgreSQL:
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/hearmeread

# For Supabase (transaction pooler — must use +asyncpg):
# DATABASE_URL=postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

DB_SCHEMA=public

# Auth
SECRET_KEY=your-secret-key-here        # generate: python -c "import secrets; print(secrets.token_hex(64))"
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=240        # 4 hours

# PII Encryption (teacher names stored encrypted at rest)
ENCRYPTION_KEY=                        # generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

# Groq ASR
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Cloudflare R2 (audio storage)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=hearmeread-audio
```

> **Important:** `ENCRYPTION_KEY` must be a valid Fernet base64 key. Once teachers are registered with it, it cannot be changed without re-encrypting all names in the database.

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Start the development server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be running at `http://localhost:8000`.  
Interactive docs (Swagger UI): `http://localhost:8000/docs`  
Alternative docs (ReDoc): `http://localhost:8000/redoc`

---

## Docker (Alternative)

Run the full stack (backend + frontend + nginx) using Docker Compose:

```bash
# From the repo root (not Backend/)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This uses `.env.dev` files in each service directory. Backend will hot-reload via bind mount.



## API Base Path

All routes are mounted under `/routes/`:

| Prefix | Description |
|---|---|
| `/routes/auth/` | Registration, login, profile, password reset |
| `/routes/admin/` | Admin-only: teachers, students, passages, assignments |
| `/routes/students/` | Teacher student CRUD + class management |
| `/routes/passages/` | Public passage library |
| `/routes/questions/` | Comprehension questions per passage |
| `/routes/sessions/` | Assessment sessions, transcription, scoring |
| `/routes/dashboard/` | Teacher dashboard summary stats |

All protected endpoints require: `Authorization: Bearer <token>`

---

## Key Environment Variable Notes

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Must use `+asyncpg` driver |
| `SECRET_KEY` | Yes | 64-char hex recommended |
| `ENCRYPTION_KEY` | Yes | Fernet key — do not change after data exists |
| `GROQ_API_KEY` | Yes | Free tier sufficient for development |
| `R2_*` | Yes | Audio storage — assessments will fail without it |
| `RESEND_API_KEY` | Yes | Email verification will fail without it |
| `DB_SCHEMA` | No | Defaults to `public` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Defaults to `240` (4 hours) |
