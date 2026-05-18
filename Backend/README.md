# HearMeRead — Backend API

FastAPI backend for the HearMeRead oral reading fluency assessment PWA.

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

---

## Project Structure

```
Backend/
├── alembic/                    # Migration scripts (001–024)
├── app/
│   ├── core/
│   │   ├── config.py           # Settings loaded from .env
│   │   ├── encryption.py       # Fernet encrypt/decrypt helpers
│   │   ├── rate_limit.py       # SlowAPI rate limiter setup
│   │   └── security.py         # JWT + bcrypt utilities
│   ├── routes/
│   │   ├── auth.py             # /routes/auth/*
│   │   ├── admin.py            # /routes/admin/*
│   │   ├── students.py         # /routes/students/*
│   │   ├── passages.py         # /routes/passages/*
│   │   ├── questions.py        # /routes/questions/*
│   │   ├── session.py          # /routes/sessions/*
│   │   ├── dashboard.py        # /routes/dashboard/*
│   │   └── asr.py              # /routes/asr/*
│   ├── services/
│   │   ├── asr_service.py      # Groq Whisper transcription
│   │   ├── levenshtein_service.py  # Word alignment + CRLA scoring
│   │   ├── audio_storage.py    # R2 upload/delete helpers
│   │   ├── cleanup.py          # APScheduler: daily audio expiry job
│   │   ├── email_service.py    # Resend transactional email
│   │   ├── letter_normalizer.py    # Grade 1 letter normalization
│   │   ├── log_service.py      # Teacher action logging
│   │   ├── passage_service.py
│   │   ├── question_service.py
│   │   ├── session_service.py
│   │   ├── storage_service.py
│   │   └── student_service.py
│   ├── utils/
│   │   ├── docx_parser.py      # .docx passage + question extraction
│   │   └── excel_parser.py     # Student Excel import
│   ├── db.py                   # Async SQLAlchemy engine + get_db()
│   ├── dependencies.py         # Auth dependencies (require_teacher, require_admin)
│   ├── models.py               # All SQLAlchemy ORM models
│   ├── router.py               # Mounts all route modules under /routes
│   ├── schema.py               # Shared Pydantic schemas
│   └── main.py                 # App factory, CORS, lifespan, APScheduler
├── requirements.txt
└── alembic.ini
```

---

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
