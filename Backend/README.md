# HearMeRead — Backend API

FastAPI backend for the HearMeRead oral reading assessment PWA.

## Stack
- **FastAPI** — web framework
- **SQLAlchemy 2** — ORM
- **PostgreSQL** — database
- **Alembic** — migrations
- **JWT (python-jose)** — authentication
- **bcrypt (passlib)** — password hashing

---

## Setup

### 1. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY
```

### 4. Create the PostgreSQL database
```bash
createdb hearmeread
```

### 5. Run migrations
```bash
alembic upgrade head
```

### 6. Start the server
```bash
uvicorn app.main:app --reload
```

API docs available at: http://localhost:8000/docs

---

## Project Structure

```
app/
├── api/
│   └── v1/
│       ├── dependencies.py     # JWT auth dependency
│       ├── router.py           # Mounts all route modules
│       └── routes/
│           ├── auth.py         # POST /auth/register, /auth/login
│           └── students.py     # Full CRUD /students
├── core/
│   ├── config.py               # Settings from .env
│   └── security.py             # JWT + bcrypt utilities
├── db/
│   └── session.py              # SQLAlchemy engine + get_db()
├── models/
│   ├── teacher.py              # Teacher ORM model
│   └── student.py              # Student ORM model
├── schemas/
│   └── student.py              # Pydantic request/response schemas
├── services/
│   └── student_service.py      # DB logic (keep out of routes)
└── main.py                     # App factory, CORS, lifespan
```

---

## API Endpoints (current)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register a new teacher |
| POST | `/api/v1/auth/login` | Login → returns JWT |
| GET | `/api/v1/students` | List students (paginated, filterable) |
| POST | `/api/v1/students` | Create a student |
| GET | `/api/v1/students/{id}` | Get a single student |
| PATCH | `/api/v1/students/{id}` | Partial update |
| DELETE | `/api/v1/students/{id}` | Delete |

All `/students` endpoints require `Authorization: Bearer <token>` header.

---

## Coming next
- `passages.py` — Passage CRUD + comprehension questions
- `assessments.py` — Session recording, CWPM computation, report
- `asr.py` — Whisper transcription endpoint
