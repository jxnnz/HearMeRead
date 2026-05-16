# HearMeRead — Backend Documentation

> **Stack:** Python · FastAPI · SQLAlchemy (async) · PostgreSQL (Supabase) · Whisper ASR · JWT Auth  
> **Base URL (dev):** `http://localhost:8000`  
> **All routes are prefixed with:** `/routes`

---

## Table of Contents

1. [Project Layout](#1-project-layout)
2. [Entry Point — `main.py`](#2-entry-point--mainpy)
3. [Database — `db.py`](#3-database--dbpy)
4. [Dependencies — `dependencies.py`](#4-dependencies--dependenciespy)
5. [Router — `router.py`](#5-router--routerpy)
6. [ORM Models — `models.py`](#6-orm-models--modelspy)
7. [Pydantic Schemas — `schema.py`](#7-pydantic-schemas--schemapy)
8. [Core Module — `/core`](#8-core-module--core)
9. [Routes — `/routes`](#9-routes--routes)
   - [Auth](#91-auth-routes--routesauthpy)
   - [Students](#92-student-routes--routesstudentspy)
   - [Passages](#93-passage-routes--routespassagespy)
   - [Questions](#94-question-routes--routesquestionspy)
   - [Sessions](#95-session-routes--routessessionpy)
   - [ASR (Audio)](#96-asr-routes--routesasrpy)
   - [Admin](#97-admin-routes--routesadminpy)
10. [Services — `/services`](#10-services--services)
    - [ASR Service](#101-asr-service)
    - [Audio Storage](#102-audio-storage)
    - [Cleanup Scheduler](#103-cleanup-scheduler)
    - [Email Service](#104-email-service)
    - [Levenshtein Scoring](#105-levenshtein-scoring-service)
    - [Passage Service](#106-passage-service)
    - [Question Service](#107-question-service)
    - [Session Service](#108-session-service)
    - [Student Service](#109-student-service)
    - [Log Service](#1010-log-service)
11. [Utilities — `/utils`](#11-utilities--utils)
12. [Extended Schemas — `/schemas`](#12-extended-schemas--schemas)
13. [Security Overview](#13-security-overview)
14. [Frontend ↔ Backend Connection Guide](#14-frontend--backend-connection-guide)

---

## 1. Project Layout

```
backend/
└── app/
    ├── main.py              # FastAPI app, CORS, lifespan
    ├── db.py                # Database engine & session factory
    ├── dependencies.py      # Auth dependency (get_current_teacher)
    ├── router.py            # Root API router
    ├── models.py            # SQLAlchemy ORM models
    ├── schema.py            # Pydantic request/response schemas
    ├── core/
    │   ├── config.py        # Environment variables / settings
    │   └── security.py      # Password hashing, JWT creation/decoding
    ├── routes/
    │   ├── auth.py          # Registration, login, verification
    │   ├── students.py      # Student CRUD
    │   ├── passages.py      # Passage CRUD + file upload
    │   ├── questions.py     # Question CRUD + file upload
    │   ├── session.py       # Assessment session lifecycle
    │   ├── asr.py           # Audio upload + Whisper transcription
    │   └── admin.py         # Admin dashboard, teacher mgmt, assignments
    ├── services/
    │   ├── asr_service.py         # Whisper model wrapper
    │   ├── audio_storage.py       # Save / retrieve / delete audio files
    │   ├── cleanup.py             # APScheduler daily audio cleanup
    │   ├── email_service.py       # Resend email API integration
    │   ├── levenshtein_service.py # Miscue analysis & reading profile scoring
    │   ├── passage_service.py     # Passage business logic
    │   ├── question_service.py    # Question business logic
    │   ├── session_service.py     # Session business logic & scoring
    │   ├── student_service.py     # Student business logic
    │   └── log_service.py         # Activity logging for admin dashboards
    ├── schemas/
    │   └── session_schemas.py     # Extended schemas for scoring payloads
    └── utils/
        ├── docx_parser.py         # .docx / .txt file parser
        └── excel_parser.py        # .xlsx student import parser
```

---

## 2. Entry Point — `main.py`

### What it does
Bootstraps the entire FastAPI application. It configures CORS, registers the main router, and manages startup/shutdown lifecycle events.

### What it is for
This is the file that runs when you start the server (`uvicorn app.main:app`). It wires everything together.

### Key behaviors
| Feature | Detail |
|---|---|
| **CORS** | Allows requests from `localhost:5173` (Vite dev) and the production `FRONTEND_URL` from `.env`. Headers, cookies, and all HTTP methods are permitted. |
| **Lifespan** | On startup: starts the APScheduler audio-cleanup job and creates the `storage/audio/` directory. On shutdown: gracefully stops the scheduler. |
| **Health check** | `GET /health` — returns `{ "status": "ok" }`. Used by deployment platforms to confirm the server is alive. |

### How to use it
```bash
# Development
uvicorn app.main:app --reload --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend connection
The frontend's `axios` (or `fetch`) base URL must match the running server address. CORS is pre-configured so the browser will not block requests from the Vite dev server.

---

## 3. Database — `db.py`

### What it does
Creates the async SQLAlchemy engine connected to Supabase PostgreSQL, and exposes a session factory (`AsyncSessionLocal`) plus a `get_db` dependency.

### What it is for
Every route that reads or writes data uses `get_db` to obtain a database session. The session is automatically committed or rolled back and closed when the request ends.

### Key details
| Setting | Value |
|---|---|
| **Driver** | `asyncpg` (async PostgreSQL) |
| **Pool** | `NullPool` — no connection pooling (required by Supabase's transaction mode) |
| **Schema** | Uses `DB_SCHEMA` env var for multi-tenant Supabase isolation |
| **Session** | `AsyncSession` with `expire_on_commit=False` |

### How to use it (in routes/services)
```python
# In a route
async def my_route(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Model))
```

### Security
The database URL (including password) is stored in `.env` and loaded via `core/config.py`. It is never hardcoded.

---

## 4. Dependencies — `dependencies.py`

### What it does
Provides the `get_current_teacher` FastAPI dependency that validates a JWT bearer token and returns the authenticated teacher record from the database.

### What it is for
Any route that requires a logged-in user adds `current_teacher: Teacher = Depends(get_current_teacher)` to its signature. This automatically rejects unauthenticated requests with a `401 Unauthorized`.

### Flow
```
Request with Authorization: Bearer <token>
  → OAuth2PasswordBearer extracts token
  → decode_access_token() validates JWT & extracts teacher_id
  → DB query fetches Teacher record
  → Returns Teacher object to the route
```

### How to use it
```python
# Protect a route
@router.get("/my-route")
async def protected(current_teacher: Teacher = Depends(get_current_teacher)):
    return {"teacher_id": current_teacher.id}
```

### Security
- Returns `401` if token is missing, expired, or tampered with.
- Returns `401` if the teacher account is not found in the database.
- Token is validated using `HS256` algorithm with `SECRET_KEY` from `.env`.

---

## 5. Router — `router.py`

### What it does
Assembles all sub-routers into a single `APIRouter` under the prefix `/routes`.

### What it is for
Keeps `main.py` clean. All API endpoints are accessible at `/routes/<subrouter-prefix>/<endpoint>`.

### Registered sub-routers
| Sub-router | Prefix | Tag |
|---|---|---|
| `auth` | `/auth` | Authentication |
| `students` | `/students` | Students |
| `passages` | `/passages` | Passages |
| `questions` | *(mixed)* | Questions |
| `sessions` | `/sessions` | Sessions |
| `asr` | *(session-scoped)* | ASR |
| `admin` | `/admin` | Admin |

### Full path example
`POST /routes/auth/login`

---

## 6. ORM Models — `models.py`

### What it does
Defines all SQLAlchemy database table models. These map directly to Supabase PostgreSQL tables.

### Enums

| Enum | Values |
|---|---|
| `GradeLevel` | `kindergarten`, `grade_1` through `grade_6` |
| `Sex` | `female`, `male` |
| `Language` | `english`, `filipino` |
| `AssessmentPeriod` | `beginning`, `middle`, `end` |
| `ReadingProfile` | `Low Emerging Reader`, `High Emerging Reader`, `Developing Reader`, `Transitioning Reader`, `Reading at Grade Level` |
| `Part1Classification` | `Full Refresher`, `Moderate Refresher`, `Light Refresher`, `Grade Ready` |
| `PassageVisibility` | `private`, `public` |
| `UserRole` | `teacher`, `admin` |

### Models

#### `Teacher`
Represents a registered teacher or admin (the app user).

| Column | Type | Notes |
|---|---|---|
| `id` | Integer | Primary key |
| `first_name`, `last_name` | String | Encrypted at rest |
| `email` | String | Unique |
| `hashed_password` | String | bcrypt hash |
| `role` | `UserRole` enum | `teacher` (default) or `admin` |
| `school_id` | Integer FK | Links teacher to a School |
| `grade_level` | `GradeLevel` | Convenience — synced from latest assignment |
| `section` | String | Convenience — synced from latest assignment |
| `employee_id` | String | Optional DepEd employee ID |
| `is_active` | Boolean | `false` = archived by admin |
| `is_verified` | Boolean | Must be `true` to log in |
| `created_at`, `updated_at` | DateTime | Auto-managed |

#### `EmailVerificationToken`
Single-use tokens sent by email to verify a teacher's account.

| Column | Notes |
|---|---|
| `token` | UUID, primary key |
| `teacher_id` | FK → Teacher |
| `expires_at` | 24 hours from creation |
| `used` | Set to `true` after first use |

#### `Student`
A learner record owned by a teacher.

| Column | Notes |
|---|---|
| `id` | UUID |
| `first_name`, `last_name` | — |
| `grade_level` | `GradeLevel` enum |
| `section` | String |
| `lrn` | Learner Reference Number, globally unique |
| `sex` | `Sex` enum |
| `teacher_id` | FK → Teacher |

#### `Passage`
A reading text used in assessments.

| Column | Notes |
|---|---|
| `id` | Integer |
| `teacher_id` | FK → Teacher (required; public passages use admin's teacher ID) |
| `title` | Nullable for Assessment 1 passages |
| `content` | Full passage text (nullable for Assessment 1) |
| `language` | `english` or `filipino` |
| `grade_level` | `GradeLevel` enum |
| `word_count` | Auto-computed on create/update |
| `visibility` | `private` (default) or `public` — public = read-only, seeded by developer |
| `assessment_type` | `1` (with tasks) or `2` (passage reading) |
| `task1_content` | Assessment 1: Task 1 reading passage |
| `task2_words` | Assessment 1: comma-separated word list |
| `task2_sentences` | Assessment 1: period-separated sentences |
| `is_archived` | Soft-delete flag |

#### `TeacherAssignment`
Links a teacher to a grade + section for a specific school year. Managed by admins.

| Column | Notes |
|---|---|
| `id` | Integer |
| `teacher_id` | FK → Teacher |
| `school_id` | FK → School |
| `grade_level` | `GradeLevel` enum |
| `section` | String |
| `school_year` | String, e.g. `"2025-2026"` |
| `is_active` | Boolean (default true) |
| `created_at` | DateTime |

> **Carry-forward logic:** If a teacher isn't reassigned for a new school year, the system falls back to their most recent active assignment.

#### `ActivityLog`
Records teacher actions for admin activity tracking.

| Column | Notes |
|---|---|
| `id` | Integer |
| `teacher_id` | FK → Teacher |
| `school_id` | FK → School |
| `action` | String (e.g. `"uploaded_passage"`, `"completed_session"`) |
| `entity_type` | String (e.g. `"passage"`, `"session"`) |
| `entity_id` | Integer — ID of affected record |
| `metadata` | JSON — additional context |
| `created_at` | DateTime |

#### `Question`
A comprehension question linked to a passage.

| Column | Notes |
|---|---|
| `id` | UUID |
| `text` | Question text |
| `order` | Display order |
| `passage_id` | FK → Passage |
| `is_archived` | Soft-delete flag |

#### `AssessmentSession`
One assessment event: a specific student reading a specific passage.

| Column | Notes |
|---|---|
| `id` | UUID |
| `teacher_id` | FK → Teacher |
| `student_id` | FK → Student |
| `passage_id` | FK → Passage |
| `school_year` | String, e.g. `"2025-2026"` |
| `period` | `AssessmentPeriod` enum |
| `language` | Language of the passage |
| `is_completed` | Set after scoring |
| `is_archived` | Soft-delete flag |

#### `ReadingResult`
Stores all scoring outputs for a completed session.

| Column | Notes |
|---|---|
| `session_id` | FK → AssessmentSession (1-to-1) |
| `task1_score`, `task2_score` | Part 1 raw scores |
| `part1_route` | `task_2L` or `task_2H` |
| `part1_classification` | `Part1Classification` enum |
| `cwpm` | Correct Words Per Minute |
| `accuracy_rate` | Percentage |
| `reading_profile` | `ReadingProfile` enum |
| `audio_path` | File path on disk |
| `audio_expires_at` | 7 days from upload |
| `word_alignments` | JSON — word-level miscue data |

#### `SessionObservation`
Teacher-rated qualitative data for a session.

| Column | Notes |
|---|---|
| `session_id` | FK → AssessmentSession (1-to-1) |
| `comprehension_score` | Count of correct answers |
| `total_questions` | Total comprehension questions |
| `fluency_level` | 1–4 rating |
| `learner_experience` | 1–5 rating |
| `remarks` | Optional free text |

---

## 7. Pydantic Schemas — `schema.py`

### What it does
Defines the request and response shapes for all API endpoints. FastAPI uses these to validate incoming JSON and serialize outgoing responses.

### Auth Schemas
| Schema | Direction | Purpose |
|---|---|---|
| `TeacherRegister` | Request | `first_name`, `last_name`, `email`, `password` |
| `LoginRequest` | Request | `email`, `password` |
| `TokenResponse` | Response | `access_token`, `token_type` |
| `ResendVerificationRequest` | Request | `email` |
| `TeacherResponse` | Response | Teacher profile fields |

### Student Schemas
| Schema | Direction | Purpose |
|---|---|---|
| `StudentCreate` | Request | All student fields |
| `StudentUpdate` | Request | All fields optional |
| `StudentResponse` | Response | Student + teacher_id |
| `StudentListResponse` | Response | Paginated list + total |

### Passage Schemas
| Schema | Direction | Purpose |
|---|---|---|
| `PassageCreate` | Request | All passage fields |
| `PassageUpdate` | Request | All fields optional |
| `PassageResponse` | Response | Full passage data |
| `PassageListResponse` | Response | Paginated list + total |

### Session Schemas
| Schema | Direction | Purpose |
|---|---|---|
| `SessionCreate` | Request | `student_id`, `passage_id`, `school_year`, `period` |
| `SessionComplete` | Request | Scoring payloads (see `/schemas`) |
| `SessionUpdate` | Request | Partial update |
| `SessionResponse` | Response | Full session + result + observation |
| `SessionListResponse` | Response | Paginated list + total |
| `DuplicateWarning` | Response (207) | Warning when duplicate session found |

### Result Schemas
| Schema | Direction | Purpose |
|---|---|---|
| `ReadingResultResponse` | Response | All scoring fields |
| `SessionObservationResponse` | Response | Comprehension + teacher ratings |

---

## 8. Core Module — `/core`

### `core/config.py`

#### What it does
Loads all environment variables using Pydantic's `BaseSettings`. All sensitive values come from `.env`.

#### Environment Variables Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret (keep this private) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: `30` |
| `RESEND_API_KEY` | Resend.com API key for email |
| `FROM_EMAIL` | Sender address for verification emails |
| `FRONTEND_URL` | Used in CORS and email links |
| `BACKEND_URL` | Used in verification email link |
| `DB_SCHEMA` | Supabase schema name (multi-tenant) |

#### How to use it
```python
from app.core.config import settings
print(settings.SECRET_KEY)
```

---

### `core/security.py`

#### What it does
Provides password hashing (bcrypt) and JWT token creation/decoding.

#### Functions

| Function | Input | Output | Notes |
|---|---|---|---|
| `get_password_hash(password)` | Plain text | bcrypt hash | Used on registration |
| `verify_password(plain, hashed)` | Both strings | `bool` | Used on login |
| `create_access_token(data, expires_delta)` | Dict + timedelta | JWT string | Sets `exp` claim |
| `decode_access_token(token)` | JWT string | `str` (subject) or `None` | Returns `None` if invalid/expired |

#### Security details
- Algorithm: `HS256`
- Token payload contains `sub` = teacher UUID string
- Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (configurable)

---

## 9. Routes — `/routes`

> All routes require `Authorization: Bearer <token>` unless marked **Public**.

---

### 9.1 Auth Routes — `routes/auth.py`

Base path: `/routes/auth`

---

#### `POST /routes/auth/register` — Public
**What it does:** Creates a new teacher account and sends a verification email.

**Request body:**
```json
{
  "first_name": "Maria",
  "last_name": "Santos",
  "email": "maria@school.edu",
  "password": "securepassword"
}
```

**Response (201):**
```json
{ "message": "Registration successful. Check your email." }
```

**Errors:**
- `400` — Email already registered

**How the frontend uses it:** Registration form on the sign-up page. After success, show a "check your email" message.

---

#### `GET /routes/auth/verify?token=<uuid>` — Public
**What it does:** Verifies the teacher's email using the token from the verification email link.

**Response (200):**
```json
{ "message": "Email verified successfully." }
```

**Errors:**
- `400` — Token invalid, expired, or already used

**How the frontend uses it:** This is the link in the verification email. The frontend receives the token as a URL query param and calls this endpoint, then redirects to login.

---

#### `POST /routes/auth/resend-verification` — Public
**What it does:** Resends the verification email to an unverified account.

**Request body:**
```json
{ "email": "maria@school.edu" }
```

**Response (200):**
```json
{ "message": "Verification email resent." }
```

---

#### `POST /routes/auth/login` — Public
**What it does:** Authenticates teacher credentials and returns a JWT access token.

**Request body:**
```json
{
  "email": "maria@school.edu",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors:**
- `401` — Wrong credentials
- `403` — Account not verified

**How the frontend uses it:** Login form. Store the returned `access_token` in memory (or `localStorage`) and attach it to all subsequent requests as `Authorization: Bearer <token>`.

---

#### `GET /routes/auth/me` — Protected
**What it does:** Returns the currently logged-in teacher's profile.

**Response (200):**
```json
{
  "id": "uuid",
  "first_name": "Maria",
  "last_name": "Santos",
  "email": "maria@school.edu",
  "is_verified": true
}
```

**How the frontend uses it:** Used to populate the teacher's name in the UI header/sidebar after login.

---

### 9.2 Student Routes — `routes/students.py`

Base path: `/routes/students`  
All routes are **protected** — only a teacher's own students are accessible.

---

#### `GET /routes/students`
**What it does:** Returns a paginated, filterable list of students belonging to the logged-in teacher.

**Query parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `page_size` | int | 10 | Items per page |
| `search` | string | — | Search by first or last name |
| `grade_level` | string | — | Filter by grade (e.g. `"Grade 1"`) |

**Response (200):**
```json
{
  "items": [ { ...student } ],
  "total": 42,
  "page": 1,
  "page_size": 10
}
```

**How the frontend uses it:** Student list/table page with search bar and grade filter.

---

#### `POST /routes/students`
**What it does:** Creates a new student record linked to the logged-in teacher.

**Request body:**
```json
{
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "grade_level": "Grade 1",
  "section": "Sampaguita",
  "lrn": "123456789012",
  "sex": "male"
}
```

**Response (201):** Created student object.

**Errors:**
- `400` — LRN already exists

**How the frontend uses it:** "Add Student" form/modal.

---

#### `GET /routes/students/{student_id}`
**What it does:** Returns a single student by ID.

**Errors:**
- `404` — Not found or belongs to another teacher

---

#### `PATCH /routes/students/{student_id}`
**What it does:** Partially updates a student's information. All fields are optional.

**Errors:**
- `400` — LRN conflict with another student
- `404` — Not found

**How the frontend uses it:** "Edit Student" modal.

---

#### `DELETE /routes/students/{student_id}`
**What it does:** Permanently deletes a student record (hard delete).

**Errors:**
- `404` — Not found

**How the frontend uses it:** "Delete Student" confirmation dialog.

---

### 9.3 Passage Routes — `routes/passages.py`

Base path: `/routes/passages`  
All routes are **protected**.

---

#### `GET /routes/passages`
**What it does:** Returns a paginated list of passages with optional filters.

**Query parameters:**
| Param | Type | Description |
|---|---|---|
| `language` | string | `english` or `filipino` |
| `grade_level` | string | `Grade 1`, `Grade 2`, `Grade 3` |
| `assessment_type` | int | `1` or `2` |
| `archived` | bool | `false` by default |
| `page` / `page_size` | int | Pagination |

---

#### `POST /routes/passages`
**What it does:** Creates a passage by supplying all fields as JSON.

**Request body:**
```json
{
  "title": "The Mango Tree",
  "content": "Once upon a time...",
  "language": "english",
  "grade_level": "Grade 2",
  "assessment_type": 2
}
```

---

#### `POST /routes/passages/upload`
**What it does:** Parses a `.docx` or `.txt` file that contains both a passage and questions in a specific format, and creates the passage + questions in one request.

**Expected file format:**
```
[PASSAGE]
The text of the passage goes here.

[QUESTIONS]
1. What is the story about?
2. Who are the characters?
```

**Request:** `multipart/form-data` with `file` field.

**Errors:**
- `400` — File too large (>5 MB), wrong format, missing sections

---

#### `POST /routes/passages/upload/passage-only`
**What it does:** Parses a file containing only the passage text.

---

#### `GET /routes/passages/{passage_id}`
**What it does:** Returns a single passage with its questions.

---

#### `PATCH /routes/passages/{passage_id}`
**What it does:** Partially updates a passage. Word count is automatically recomputed if content changes.

---

#### `DELETE /routes/passages/{passage_id}`
**What it does:** Soft-deletes a passage by setting `is_archived = true`. The record remains in the database.

---

### 9.4 Question Routes — `routes/questions.py`

---

#### `GET /routes/passages/{passage_id}/questions`
**What it does:** Returns all non-archived questions for a given passage.

---

#### `POST /routes/passages/{passage_id}/questions`
**What it does:** Adds a single question to a passage.

**Request body:**
```json
{ "text": "What happened at the end?", "order": 3 }
```

---

#### `POST /routes/passages/{passage_id}/questions/upload`
**What it does:** Bulk-adds questions from a `.docx` or `.txt` file. Strips numbering prefixes automatically (e.g. `1.`, `Q1:`, `(a)`).

---

#### `PATCH /routes/questions/{question_id}`
**What it does:** Updates question text or order.

---

#### `DELETE /routes/questions/{question_id}`
**What it does:** Soft-deletes a question (`is_archived = true`).

---

### 9.5 Session Routes — `routes/session.py`

Base path: `/routes/sessions`  
All routes are **protected**.

---

#### `GET /routes/sessions`
**What it does:** Returns a paginated list of assessment sessions for the logged-in teacher.

**Query parameters:** `page`, `page_size`, `student_id`, `period`, `school_year`, `is_completed`

---

#### `POST /routes/sessions`
**What it does:** Creates a new assessment session.

**Request body:**
```json
{
  "student_id": "uuid",
  "passage_id": "uuid",
  "school_year": "2025-2026",
  "period": "beginning"
}
```

**Response (201):** Session object.  
**Response (207 Multi-Status):** Session created but a duplicate session exists. Returns both the new session and a `DuplicateWarning`.

**How the frontend uses it:** "Start Assessment" form. If 207 is returned, show a warning modal asking the teacher to confirm.

---

#### `GET /routes/sessions/{session_id}`
**What it does:** Returns a single session with its result and observation data.

---

#### `POST /routes/sessions/{session_id}/score-task1`
**What it does:** Runs scoring for Task 1 only (intermediate step). Returns Task 1 alignment and score without saving to the database.

**Request body:**
```json
{
  "reference_text": "Ang bata ay...",
  "transcribed_text": "ang bata ay"
}
```

**How the frontend uses it:** Show live Task 1 miscue analysis before the teacher moves to Task 2.

---

#### `POST /routes/sessions/{session_id}/score-part1`
**What it does:** Runs scoring for both Task 1 and Task 2, returns routing decision (`task_2L` or `task_2H`). Does **not** save to DB.

---

#### `POST /routes/sessions/{session_id}/complete`
**What it does:** Finalizes the session. Runs full Part 1 + Part 2 scoring, saves `ReadingResult` and `SessionObservation` to the database, marks session as `is_completed = true`.

**Request body:**
```json
{
  "part1": {
    "task1": { "reference_text": "...", "transcribed_text": "..." },
    "task2": { "reference_text": "...", "transcribed_text": "..." }
  },
  "part2": {
    "passage_text": "...",
    "transcribed_text": "...",
    "reading_time_sec": 45.3,
    "grade_level": "Grade 2",
    "comprehension_correct": 3,
    "fluency_level": 3,
    "learner_experience": 4
  }
}
```

**Response (200):**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "part1": {
    "task1_score": 8,
    "task2_score": 6,
    "route": "task_2H",
    "classification": "Grade Ready",
    "alignments": { ... }
  },
  "part2": {
    "cwpm": 72,
    "accuracy_rate": 95.2,
    "reading_profile": "Grade Level",
    ...
  }
}
```

---

#### `PATCH /routes/sessions/{session_id}`
**What it does:** Partially updates session metadata (school year, period, etc.).

---

#### `DELETE /routes/sessions/{session_id}`
**What it does:** Soft-deletes a session (`is_archived = true`).

---

#### `GET /routes/students/{student_id}/sessions`
**What it does:** Returns all sessions for a specific student, scoped to the logged-in teacher.

**How the frontend uses it:** Student detail/profile page showing assessment history.

---

### 9.6 ASR Routes — `routes/asr.py`

> See existing section below.

---

### 9.7 Admin Routes — `routes/admin.py`

Base path: `/routes/admin`  
All routes require **admin role** — uses `Depends(require_admin)` which checks `teacher.role == 'admin'`.

---

#### `GET /routes/admin/dashboard`
**What it does:** Returns school-wide stats: teacher count, students assessed, session counts, completion rate, period breakdown.

**Response (200):**
```json
{
  "school_code": "ABC123",
  "school_name": "Sample Elementary School",
  "total_teachers": 12,
  "total_students_assessed": 340,
  "total_sessions": 420,
  "completed_sessions": 380,
  "completion_rate": 90.5,
  "period_breakdown": { "beginning": 120, "middle": 130, "end": 130 }
}
```

---

#### `GET /routes/admin/teachers`
**What it does:** Lists all teachers in the admin's school (excluding other admin accounts).

**Response (200):** Array of teacher objects with grade_level, section, employee_id, is_active, is_verified.

---

#### `PATCH /routes/admin/teachers/{teacher_id}`
**What it does:** Admin edits teacher's grade level, section, or employee ID.

**Request body:**
```json
{
  "grade_level": "grade_2",
  "section": "Love",
  "employee_id": "EMP-001"
}
```

---

#### `PATCH /routes/admin/teachers/{teacher_id}/archive`
**What it does:** Soft-archives a teacher by setting `is_active = false`.

---

#### `GET /routes/admin/teachers/{teacher_id}/logs`
**What it does:** Paginated activity logs for a specific teacher.

**Query params:** `page` (default 1), `page_size` (default 20, max 100)

**Response (200):**
```json
{
  "total": 42,
  "page": 1,
  "page_size": 20,
  "logs": [ { "action": "uploaded_passage", "entity_type": "passage", ... } ]
}
```

---

#### `GET /routes/admin/students`
**What it does:** Returns class cards for all active teachers with grade_level + section in the school.

**Response (200):**
```json
[
  {
    "teacher_id": 5,
    "teacher_name": "Jenny Kim",
    "grade_level": "grade_2",
    "section": "Love"
  }
]
```

> ⚠️ **Known gap:** Does not return `student_count`. Frontend displays `card.student_count ?? 0` which always shows 0.

---

#### `GET /routes/admin/students/{teacher_id}`
**What it does:** Returns all students under a teacher with their latest session result for the given school_year and period.

**Query params:** `school_year`, `period`

**Response (200):**
```json
{
  "teacher_id": 5,
  "teacher_name": "Jenny Kim",
  "grade_level": "grade_2",
  "section": "Love",
  "students": [
    {
      "student_id": 1,
      "first_name": "Liam",
      "last_name": "Manuel",
      "lrn": "123578946152",
      "sex": "female",
      "reading_profile": null,
      "cwpm": null,
      "period": null,
      "school_year": null,
      "is_completed": null
    }
  ]
}
```

> ⚠️ **Known gap:** Does not return `reading_result`, `observation`, `session_date`, or `passage_title` — the frontend class record table expects these fields but they are not present.

---

#### `GET /routes/admin/assignments`
**What it does:** Lists all teacher assignments for the school, optionally filtered by school_year.

**Query params:** `school_year` (optional)

---

#### `POST /routes/admin/assignments`
**What it does:** Creates a new assignment for a teacher. Syncs the teacher's convenience columns (`grade_level`, `section`).

**Request body:**
```json
{
  "teacher_id": 5,
  "grade_level": "grade_2",
  "section": "Love",
  "school_year": "2025-2026"
}
```

**Errors:**
- `404` — Teacher not in admin's school
- `409` — Teacher already has an active assignment for this school year

---

#### `PATCH /routes/admin/assignments/{assignment_id}`
**What it does:** Updates an existing assignment. Syncs teacher convenience columns if assignment is active.

---

#### `DELETE /routes/admin/assignments/{assignment_id}`
**What it does:** Hard-deletes an assignment.

---

Session-scoped. All routes are **protected**.

---

#### `POST /routes/sessions/{session_id}/transcribe`
**What it does:** Accepts an audio file, runs Whisper ASR transcription, saves the file to disk, and returns the transcript with word-level timestamps.

**Request:** `multipart/form-data` with `file` field.  
**Accepted formats:** `.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg`, `.mp4`

**Response (200):**
```json
{
  "transcript": "ang bata ay nagbabasa",
  "word_timestamps": [
    { "word": "ang", "start": 0.0, "end": 0.4 },
    ...
  ],
  "language": "filipino",
  "model_used": "tiny"
}
```

**Whisper model selection:**
- Filipino → `tiny` model
- English → `base` model

**How the frontend uses it:** After the teacher records audio during an assessment, the recording is sent here. The returned transcript is pre-filled in the transcription input field for the teacher to review/edit before submitting.

---

#### `GET /routes/sessions/{session_id}/audio`
**What it does:** Streams the audio file for a session back to the client.

**Response:** Audio file as a streaming response with the correct MIME type.

**Errors:**
- `404` — No audio recorded for this session
- `410 Gone` — Audio has expired (7-day retention)

**How the frontend uses it:** Audio playback on the session detail/review page.

---

## 10. Services — `/services`

Services contain the business logic. Routes call services; services interact with the database and external APIs.

---

### 10.1 ASR Service

**File:** `services/asr_service.py`

#### `transcribe_audio(file_bytes, filename, language)`
Loads the appropriate Whisper model (cached per process), runs transcription, and returns the transcript with word-level timestamps.

| Language | Whisper Model |
|---|---|
| `filipino` | `tiny` |
| `english` | `base` |

Models are cached after first load — subsequent requests to the same language are fast.

---

### 10.2 Audio Storage

**File:** `services/audio_storage.py`

| Function | What it does |
|---|---|
| `save_audio(session_id, file_bytes, ext)` | Saves file to `storage/audio/` with name `{session_id}_{timestamp}.{ext}`. Returns path and 7-day expiry datetime. |
| `delete_audio(audio_path)` | Deletes audio file from disk. |
| `get_audio_path(audio_path)` | Returns `Path` object if file exists, else `None`. |
| `get_audio_media_type(ext)` | Maps `.webm` → `audio/webm`, etc. |

**Retention:** Audio files expire 7 days after upload. The daily cleanup job deletes expired files automatically.

---

### 10.3 Cleanup Scheduler

**File:** `services/cleanup.py`

Uses **APScheduler** to run `delete_expired_audio()` daily at 02:00 UTC. This function queries all `ReadingResult` rows where `audio_expires_at < now` and `audio_path IS NOT NULL`, deletes the files from disk, and clears the path from the database.

Started automatically on app startup via the lifespan context in `main.py`.

---

### 10.4 Email Service

**File:** `services/email_service.py`

#### `send_verification_email(email, token)`
Sends an HTML + plain text verification email via the **Resend** API. The email contains a link:
```
{BACKEND_URL}/routes/auth/verify?token={token}
```
Token expires after 24 hours.

---

### 10.5 Levenshtein Scoring Service

**File:** `services/levenshtein_service.py`

This is the core assessment engine. It computes reading accuracy by comparing the reference passage text to the student's transcription using word-level Levenshtein alignment.

#### Miscue Types
| Type | Meaning |
|---|---|
| `correct` | Word read correctly |
| `substitution` | Wrong word read |
| `insertion` | Extra word added |
| `deletion` | Word skipped |

#### Key Functions

##### `align_words(reference, transcribed)`
Runs Levenshtein distance on tokenized word lists. Returns a list of `WordAlignment` objects, each tagged with a `MiscueType`.

##### `score_part1(task1_ref, task1_trans, task2_ref, task2_trans)`
Scores both Task 1 (short word/phrase list) and Task 2 (sentences). Determines routing:
- Task 1 score low → `task_2L` (low route)
- Task 1 score high → `task_2H` (high route)

Returns `Part1Result` with scores, route, classification, and word alignments.

##### `score_part2(passage_text, transcribed, reading_time_sec, grade_level, comprehension_correct, total_questions, fluency_level, learner_experience, word_timestamps)`
Scores the passage reading. Computes:
- **CWPM** = (correct words / reading time) × 60
- **Accuracy rate** = correct words / total words × 100
- **Reading profile** = derived from Part 1 classification + accuracy + comprehension score

Returns `Part2Result` with all metrics.

#### Part 1 Classification
| Score Range | Classification |
|---|---|
| 0–49% | Full Refresher |
| 50–74% | Moderate Refresher |
| 75–89% | Light Refresher |
| 90–100% | Grade Ready |

#### Reading Profile Matrix
The final reading profile is determined by crossing Part 1 classification, Part 2 accuracy rate, and comprehension score.

---

### 10.6 Passage Service

**File:** `services/passage_service.py`

| Function | What it does |
|---|---|
| `get_passages(db, teacher_id, filters)` | Paginated list with language/grade/type/archived filters |
| `get_passage_by_id(db, passage_id, teacher_id)` | Fetch single passage; raises 404 if not found or wrong teacher |
| `create_passage(db, data, teacher_id)` | Creates passage; auto-computes word count |
| `create_passage_from_docx(db, file, teacher_id)` | Parses uploaded file via `docx_parser`, then creates passage |
| `update_passage(db, passage_id, data, teacher_id)` | Updates; recomputes word count if content changed |
| `archive_passage(db, passage_id, teacher_id)` | Sets `is_archived = True` |

---

### 10.7 Question Service

**File:** `services/question_service.py`

| Function | What it does |
|---|---|
| `get_questions(db, passage_id, include_archived)` | Lists questions for a passage |
| `create_question(db, passage_id, data)` | Adds a question |
| `bulk_create_questions(db, passage_id, texts)` | Creates multiple questions from a list of strings |
| `get_question_by_id(db, question_id, teacher_id)` | Fetch with ownership check |
| `update_question(db, question_id, data, teacher_id)` | Updates text or order |
| `archive_question(db, question_id, teacher_id)` | Soft-deletes a question |

---

### 10.8 Session Service

**File:** `services/session_service.py`

| Function | What it does |
|---|---|
| `get_sessions(db, teacher_id, filters)` | Paginated sessions with filters |
| `get_session_by_id(db, session_id, teacher_id)` | Fetch single session with ownership check |
| `create_session(db, data, teacher_id)` | Creates session; calls `check_duplicate()` and returns warning if duplicate |
| `check_duplicate(db, student_id, school_year, period)` | Finds existing session for same student/year/period |
| `complete_session(db, session_id, payload, teacher_id)` | Runs scoring via levenshtein_service, upserts ReadingResult + SessionObservation, marks completed |
| `update_session(db, session_id, data, teacher_id)` | Partial update |
| `archive_session(db, session_id, teacher_id)` | Soft-delete |

---

### 10.9 Student Service

**File:** `services/student_service.py`

| Function | What it does |
|---|---|
| `get_students(db, teacher_id, page, page_size, search, grade_level)` | Paginated + searchable list |
| `get_student_by_id(db, student_id, teacher_id)` | Fetch with ownership; raises 404 |
| `create_student(db, data, teacher_id)` | Creates student; checks LRN uniqueness |
| `update_student(db, student_id, data, teacher_id)` | Updates; re-checks LRN uniqueness |
| `delete_student(db, student_id, teacher_id)` | Hard delete |

---

### 10.10 Log Service

**File:** `services/log_service.py`

| Function | What it does |
|---|---|
| `log_activity(db, teacher_id, school_id, action, entity_type, entity_id, metadata)` | Creates an `ActivityLog` entry for admin dashboards |

Called automatically by passage_service (uploads), session_service (completions), and student_service (CRUD).

---

## 11. Utilities — `/utils`

### `utils/docx_parser.py`

**What it does:** Parses `.docx` and `.txt` files into structured passage/question data.

| Function | What it does |
|---|---|
| `validate_upload(file)` | Enforces 5 MB max size and `.docx`/`.txt` type. Raises `400` on violation. |
| `parse_combined(file)` | Splits file on `[PASSAGE]` and `[QUESTIONS]` markers. Returns `(passage_text, [question_texts])`. |
| `parse_passage_only(file)` | Returns the full file content as passage text. |
| `parse_questions_only(file)` | Returns a list of question strings with numbering stripped. |
| `_strip_numbering(text)` | Removes prefixes: `1.`, `1)`, `Q1:`, `(a)`, etc. |
| `_read_docx_lines(file)` | Uses `python-docx` to extract paragraph lines. |
| `_read_txt_lines(file)` | Reads UTF-8 text lines. |

**Supported file format for combined upload:**
```
[PASSAGE]
Your reading passage text here.
Can be multiple paragraphs.

[QUESTIONS]
1. What is the title?
2. Who is the main character?
3. What happened at the end?
```

---

## 12. Extended Schemas — `/schemas`

### `schemas/session_schemas.py`

These schemas handle the complex scoring payloads that `schema.py` does not cover.

#### Request Schemas

##### `Part1CompleteIn`
```json
{
  "reference_text": "Ang bata ay...",
  "transcribed_text": "ang bata ay"
}
```
Used for both Task 1 and Task 2 scoring inputs.

##### `Part2CompleteIn`
```json
{
  "passage_text": "Full passage text...",
  "transcribed_text": "student reading...",
  "reading_time_sec": 45.3,
  "grade_level": "Grade 2",
  "comprehension_correct": 3,
  "fluency_level": 3,
  "learner_experience": 4,
  "word_timestamps": [ { "word": "ang", "start": 0.0, "end": 0.4 } ]
}
```

##### `CompleteSessionIn`
```json
{
  "part1": {
    "task1": { ... },
    "task2": { ... }
  },
  "part2": { ... }
}
```

#### Response Schemas

| Schema | Fields |
|---|---|
| `WordAlignmentOut` | `reference`, `transcribed`, `miscue_type` |
| `Part1ResultOut` | `task1_score`, `task2_score`, `route`, `classification`, `task1_alignments`, `task2_alignments` |
| `Part2ResultOut` | `cwpm`, `accuracy_rate`, `reading_profile`, `comprehension_score`, `fluency_level`, `learner_experience` |
| `CompleteSessionOut` | `session_id`, `status`, `part1: Part1ResultOut`, `part2: Part2ResultOut` |

#### Intermediate Scoring Schemas

| Schema | Purpose |
|---|---|
| `Task1ScoreIn` / `Task1ScoreOut` | Score Task 1 only without saving |
| `Part1ScoreIn` | Score both Part 1 tasks without saving |

---

## 13. Security Overview

| Concern | Implementation |
|---|---|
| **Password storage** | bcrypt hashing via `passlib`. Passwords are never stored in plain text. |
| **Authentication** | JWT tokens (HS256). Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES`. |
| **Authorization** | Every data access is scoped to the authenticated teacher's `teacher_id`. A teacher cannot read or modify another teacher's data. |
| **Email verification** | Account cannot log in until email is verified. Tokens are single-use with a 24-hour expiry. |
| **CORS** | Only whitelisted origins (localhost dev + production `FRONTEND_URL`) can make requests. |
| **Secrets** | All sensitive values (`SECRET_KEY`, `DATABASE_URL`, API keys) are in `.env` and never committed to source control. |
| **Input validation** | Pydantic schemas validate all request bodies. FastAPI returns `422 Unprocessable Entity` for malformed input. |
| **File uploads** | Enforced 5 MB size limit and file type whitelist (`.docx`, `.txt` for documents; audio format list for ASR). |
| **Soft deletes** | Passages, questions, and sessions use `is_archived` flags rather than hard deletion, preserving data integrity. |
| **Audio retention** | Audio files are automatically deleted after 7 days. |

---

## 14. Frontend ↔ Backend Connection Guide

### Setting Up API Calls

All requests must include the JWT token after login:
```javascript
// Store token after login
localStorage.setItem('token', response.data.access_token);

// Attach to every request (Axios interceptor)
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Base URL Configuration
```javascript
// .env (Vite)
VITE_API_BASE_URL=http://localhost:8000/routes

// axios instance
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
```

### Feature-to-Endpoint Map

| UI Feature | HTTP Method | Endpoint |
|---|---|---|
| Register | POST | `/auth/register` |
| Login | POST | `/auth/login` |
| Verify email | GET | `/auth/verify?token=...` |
| Get profile | GET | `/auth/me` |
| Student list page | GET | `/students?page=1&search=...` |
| Add student modal | POST | `/students` |
| Edit student modal | PATCH | `/students/{id}` |
| Delete student | DELETE | `/students/{id}` |
| Passage list | GET | `/passages?language=english` |
| Upload passage+questions | POST | `/passages/upload` |
| Start assessment | POST | `/sessions` |
| Upload & transcribe audio | POST | `/sessions/{id}/transcribe` |
| Preview Task 1 results | POST | `/sessions/{id}/score-task1` |
| Complete assessment | POST | `/sessions/{id}/complete` |
| Student history | GET | `/students/{id}/sessions` |
| Play back audio | GET | `/sessions/{id}/audio` |
| **Admin: Dashboard** | GET | `/admin/dashboard` |
| **Admin: Teacher list** | GET | `/admin/teachers` |
| **Admin: Edit teacher** | PATCH | `/admin/teachers/{id}` |
| **Admin: Archive teacher** | PATCH | `/admin/teachers/{id}/archive` |
| **Admin: Teacher logs** | GET | `/admin/teachers/{id}/logs` |
| **Admin: Class cards** | GET | `/admin/students` |
| **Admin: Class record** | GET | `/admin/students/{teacher_id}` |
| **Admin: List assignments** | GET | `/admin/assignments` |
| **Admin: Create assignment** | POST | `/admin/assignments` |
| **Admin: Update assignment** | PATCH | `/admin/assignments/{id}` |
| **Admin: Delete assignment** | DELETE | `/admin/assignments/{id}` |

### Handling the 207 Duplicate Warning
```javascript
const response = await api.post('/sessions', payload);
if (response.status === 207) {
  // Show warning modal: "A session already exists for this student/period."
  // response.data.warning contains the duplicate session details
  // response.data.session contains the newly created session
}
```

### Handling Token Expiry
```javascript
axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Token expired — redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```
