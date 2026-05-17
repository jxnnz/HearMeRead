# HearMeRead — Frontend Documentation

> **Stack:** React 18 · Vite · Vanilla CSS · Axios · PWA (vite-plugin-pwa)
> **Supported grades:** Grade 1, Grade 2, and Grade 3 only (Filipino and English)
> **Dev server:** `npm run dev` → `http://localhost:5173`

---

## Table of Contents

1. [Project Layout](#1-project-layout)
2. [Entry Point — `main.jsx` and `App.jsx`](#2-entry-point--mainjsx-and-appjsx)
3. [Routing](#3-routing)
4. [API Layer — `services/api.js`](#4-api-layer--servicesapijs)
5. [Data & Configuration](#5-data--configuration)
6. [Pages](#6-pages)
   - [Auth Pages](#61-auth-pages)
   - [Teacher Pages](#62-teacher-pages)
   - [Assessment Flow](#63-assessment-flow)
   - [Student Pages](#64-student-pages)
   - [Passage Pages](#65-passage-pages)
   - [Admin Pages](#66-admin-pages)
7. [Components](#7-components)
   - [Layout Components](#71-layout-components)
   - [Assessment Components](#72-assessment-components)
   - [Student Components](#73-student-components)
   - [Passage Components](#74-passage-components)
   - [Legal Components](#75-legal-components)
8. [Hooks](#8-hooks)
9. [Modals](#9-modals)
10. [Styling Architecture](#10-styling-architecture)
11. [PWA Configuration](#11-pwa-configuration)
12. [Environment Variables](#12-environment-variables)

---

## 1. Project Layout

```
frontend/src/
├── main.jsx                    # React root mount
├── App.jsx                     # Router + route definitions
├── App.css                     # Global app styles
├── index.css                   # CSS reset + base variables
├── assets/                     # Static images, icons, logos
├── components/                 # Reusable UI components
│   ├── component css/          # CSS files for each component
│   └── legal/                  # Terms & privacy content components
├── data/                       # Static config and constants
│   ├── assessmentConstants.js  # Period maps, observation levels
│   ├── gradeAssessmentConfig.js # Grade/language assessment rules
│   └── mockData.js             # Development test data
├── hooks/                      # Custom React hooks
├── modals/                     # Modal dialog components
├── pages/                      # Page-level components
│   ├── Assessment/             # Multi-step assessment wizard
│   ├── Student/                # Student management pages
│   ├── passages/               # Passage management pages
│   └── pages css/              # CSS files for pages
├── services/                   # API client layer
│   └── api.js                  # Axios instance + all API functions
└── utils/                      # Utility functions
```

---

## 2. Entry Point — `main.jsx` and `App.jsx`

### `main.jsx`
Mounts the React app into `#root`. Wraps `<App />` in `<BrowserRouter>`.

### `App.jsx`
Defines all routes and handles auth-based redirects. Key behaviors:

| Behavior | Detail |
|---|---|
| **Auth check** | On mount, calls `GET /auth/me` to validate the stored JWT token |
| **Role routing** | Teachers → `/dashboard`, Admins → `/admin/dashboard` |
| **Protected routes** | All `/dashboard/*`, `/assessment/*`, `/student/*`, `/passages/*` require auth |
| **Public routes** | `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password` |
| **Loading state** | Shows `<LoadingPage />` while verifying auth on first load |

---

## 3. Routing

| Path | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/login` | `LoginPage` | Public |
| `/signup` | `SignupPage` | Public |
| `/signup-success` | `SignupSuccessPage` | Public |
| `/forgot-password` | `ForgotPasswordPage` | Public |
| `/reset-password` | `ResetPasswordPage` | Public |
| `/dashboard` | `DashboardPage` | Teacher |
| `/assessment` | `AssessmentPage` | Teacher |
| `/student` | `StudentListPage` | Teacher |
| `/student/:id` | `StudentRecordPage` | Teacher |
| `/student/:id/class-record` | `ClassRecordPage` | Teacher |
| `/passages` | `PassagePage` | Teacher |
| `/admin/dashboard` | `AdminDashboardPage` | Admin |
| `/admin/teachers` | `AdminTeachersPage` | Admin |
| `/admin/students` | `AdminStudentsPage` | Admin |
| `/admin/passages` | `AdminPassagesPage` | Admin |

---

## 4. API Layer — `services/api.js`

### Axios Instance
- Base URL: `VITE_API_BASE_URL` from `.env` (default: `http://localhost:8000/routes`)
- Auto-attaches `Authorization: Bearer <token>` via request interceptor
- Auto-redirects to `/login` on `401 Unauthorized` responses

### API Namespaces

| Namespace | Purpose | Key Functions |
|---|---|---|
| `authApi` | Registration, login, profile | `register()`, `login()`, `getMe()`, `forgotPassword()`, `resetPassword()` |
| `studentsApi` | Student CRUD | `getStudents()`, `createStudent()`, `updateStudent()`, `deleteStudent()` |
| `passagesApi` | Passage CRUD + upload | `getPassages()`, `createPassage()`, `uploadFile()`, `uploadPassageOnly()` |
| `questionsApi` | Question CRUD | `getQuestions()`, `createQuestion()`, `uploadQuestions()` |
| `sessionsApi` | Assessment lifecycle | `createSession()`, `transcribe()`, `scoreTask1()`, `scorePart1()`, `completeSession()` |
| `dashboardApi` | Dashboard stats | `getSummary()` |
| `adminApi` | Admin management | `getTeachers()`, `updateTeacher()`, `createAssignment()`, `getClassRecord()` |

### Caching
In-memory cache with 5-minute TTL for dashboard data. Uses `withCache()` wrapper.

---

## 5. Data & Configuration

### `assessmentConstants.js`
Static lookup tables for the assessment UI:

| Export | Contents |
|---|---|
| `PERIOD_MAP` | Maps `BoSY`/`MoSY`/`EoSY` → `beginning`/`middle`/`end` |
| `OBSERVATION_LEVELS` | Fluency level descriptions (1–4) |
| `EXPERIENCE_OPTIONS` | Learner experience rating options (1–5) |

### `gradeAssessmentConfig.js`
Central configuration for grade/language-specific assessment rules. Single source of truth for:

| Config key | What it controls |
|---|---|
| `task1.type` | `letters` (G1), `sentences` (G2–3), `words` (English G3) |
| `task1.items` | Number of items (e.g. 10 letters for G1) |
| `task2.asr_mode` | `full_recording` or `teacher_input` (rhyme scoring) |
| `routing.threshold` | Score cutoff for Task 2L vs 2H routing |
| `routing.mode` | `threshold_split` (Filipino) or `binary` (English) |
| `classification` | `filipino_route_dependent` or `english_single_scale` |
| `part2_time_limit` | Seconds allowed for Part 2 reading |

**Key exports:**
- `getAssessmentConfig(language, grade)` — Returns full config object
- `getPart2TimeLimit(language, grade)` — Returns time limit in seconds
- `ASSESSMENT_CONFIG` — Raw config object

---

## 6. Pages

### 6.1 Auth Pages

| Page | File | Purpose |
|---|---|---|
| Landing | `LandingPage.jsx` | Welcome page with CTA buttons |
| Login | `LoginPage.jsx` | Email/password login form |
| Signup | `SignupPage.jsx` | Teacher registration form wrapper |
| Signup Success | `SignupSuccessPage.jsx` | "Check your email" confirmation |
| Forgot Password | `ForgotPasswordPage.jsx` | Email input for password reset |
| Reset Password | `ResetPasswordPage.jsx` | New password form (token-based) |

### 6.2 Teacher Pages

| Page | File | Purpose |
|---|---|---|
| Dashboard | `DashboardPage.jsx` | Stats cards, charts, "New Session" CTA |

### 6.3 Assessment Flow

The assessment is a multi-step wizard in `AssessmentPage.jsx`. It manages 13+ steps via a `STEPS` enum:

| Step | Constant | Component | Description |
|---|---|---|---|
| Session info | `INFO` | `InfoStep` | Student/passage/language selection |
| Task 1 reading | `A1_G1` | `ReadingStep` | Live recording with countdown |
| Task 1 processing | `A1_G1_LOADING` | `LoadingScreen` | Audio transcription in progress |
| Task 1 transcript | `A1_G1_PREVIEW` | `TranscriptionPreviewStep` | Teacher reviews/edits transcript |
| Task 1 results | `A1_G1_RESULT` | `A1TaskResultStep` | Score display + routing decision |
| Task 2 reading | `A1_G2` | `ReadingStep` | Second recording for routed content |
| Task 2 processing | `A1_G2_LOADING` | `LoadingScreen` | Audio transcription |
| Task 2 transcript | `A1_G2_PREVIEW` | `TranscriptionPreviewStep` | Teacher reviews/edits |
| A1 results | `A1_G2_RESULT` | `A1OnlyResultsStep` | Combined Part 1 results |
| Story selection | `A2_SELECT` | `A2SelectStep` | Pick Assessment 2 passage |
| Story reading | `A2` | `ReadingStep` | Timed reading with countdown |
| Story processing | `A2_LOADING` | `LoadingScreen` | Transcription |
| Story transcript | `A2_PREVIEW` | `TranscriptionPreviewStep` | Review |
| Comprehension | `COMPREHENSION` | `ComprehensionStep` | Teacher marks correct/wrong |
| Learner exp. | `LEARNER_EXP` | `LearnerExperienceStep` | 1–5 rating |
| Observation | `OBSERVATION` | `ObservationStep` | Fluency 1–4 + remarks |
| Final results | `RESULTS` | `ResultsStep` | Full summary + export |

**Key state management:**
- `form` — Session info (student, passage, language, grade)
- `isRecording` / `isPaused` — MediaRecorder state
- `countdown` — 3-second countdown before recording
- `audioFile` — Recorded audio blob
- `g1Transcript` / `g2Transcript` / `a2Transcript` — Editable transcripts
- `task1ScoreResult` / `part1Result` — Scoring results from backend

**Recording flow:**
```
User clicks Record → getUserMedia() → Countdown 3→2→1 → recorder.start()
```

### 6.4 Student Pages

| Page | File | Purpose |
|---|---|---|
| Student List | `Student/StudentListPage.jsx` | Card grid with search/filter |
| Student Record | `Student/StudentRecordPage.jsx` | Profile + assessment history |
| Class Record | `Student/ClassRecordPage.jsx` | DepEd-style spreadsheet view |

### 6.5 Passage Pages

| Page | File | Purpose |
|---|---|---|
| Passage List | `passages/PassagePage.jsx` | Split view: A1 cards + A2 cards |

### 6.6 Admin Pages

| Page | File | Purpose |
|---|---|---|
| Dashboard | `AdminDashboardPage.jsx` | School-wide stats |
| Teachers | `AdminTeachersPage.jsx` | Teacher table + assign/edit/archive/logs |
| Students | `AdminStudentsPage.jsx` | Class cards → read-only class record |
| Passages | `AdminPassagesPage.jsx` | Public passage CRUD with A1/A2 forms |

**Admin grade dropdowns only show Grade 1, Grade 2, and Grade 3.**

---

## 7. Components

### 7.1 Layout Components

| Component | Purpose |
|---|---|
| `Layout.jsx` | Main app shell (sidebar wrapper) |
| `Sidebar.jsx` | Navigation sidebar with role-based links |
| `TopBar.jsx` | Page header bar |
| `AuthLayout.jsx` | Centered card layout for auth pages |
| `PublicNav.jsx` | Navigation bar for public/landing pages |

### 7.2 Assessment Components

| Component | Purpose |
|---|---|
| `CountdownOverlay.jsx` | **Fullscreen 3→2→1 countdown** before every recording. Glassmorphism backdrop, pop-in animation, progress dots. |
| `ComprehensionStep.jsx` | Teacher marks comprehension questions as Correct/Wrong/N/A |
| `RhymeScoringStep.jsx` | **Grade 1 Task 2L** — Teacher marks rhyme pairs as Oo/Hindi. Calculates score vs answer key. |
| `ResultsStep.jsx` | Full assessment results with export/print |
| `A1OnlyResultsStep.jsx` | Assessment 1–only results (no A2 data) |
| `LoadingScreen.jsx` | Spinner with message |
| `RecordingTimer.jsx` | Visual recording time display |
| `WordHighlightView.jsx` | Color-coded word alignment display |

### 7.3 Student Components

| Component | Purpose |
|---|---|
| `StudentCard.jsx` | Student grid card with profile badge |
| `StudentInfoForm.jsx` | Add/edit student form |
| `StudentDetailsForm.jsx` | Student details within profile |
| `StudentProfileCard.jsx` | Profile header with stats |
| `StudentStatsBar.jsx` | Stats summary bar |
| `AssessmentHistoryTable.jsx` | Full assessment history with export |

### 7.4 Passage Components

| Component | Purpose |
|---|---|
| `PassageCard.jsx` | Passage list card |
| `PassageModal.jsx` | Add/edit passage dialog |
| `PassageDetailsForm.jsx` | Passage content form fields |
| `PassageQuestionForm.jsx` | Comprehension question editor |
| `UploadModal.jsx` | Document upload + parsing modal |

### 7.5 Legal Components

| Component | Purpose |
|---|---|
| `LegalModal.jsx` | Modal wrapper for legal documents |
| `legal/TeacherTermsContent.jsx` | Teacher Terms & Conditions |
| `legal/AdminTermsContent.jsx` | Admin Terms & Conditions |
| `legal/AdminPrivacyContent.jsx` | Admin Data Privacy Agreement (RA 10173) |

---

## 8. Hooks

| Hook | File | Purpose |
|---|---|---|
| `useToast` | `hooks/Usetoast.js` | Toast notification state management. Returns `{ toasts, removeToast, showSaveSuccess }`. |

---

## 9. Modals

| Modal | File | Purpose |
|---|---|---|
| `Toast` | `modals/Toast.jsx` | Floating toast notifications |
| `StudentInfoModal` | `modals/StudentInfoModal.jsx` | Student detail view popup |

---

## 10. Styling Architecture

### Approach
- **Vanilla CSS** — No CSS framework (no Tailwind/Bootstrap)
- **Component-scoped CSS** — Each component has a matching `.css` file in `component css/` or `pages css/`
- **Shared class names** — Assessment components share `asp-*` prefixes, class record uses `cr-*`

### Key CSS files
| File | Scope |
|---|---|
| `index.css` | Global reset + CSS variables + font imports |
| `App.css` | App shell layout |
| `AssessmentPage.css` | All `asp-*` classes for the assessment wizard |
| `ClassRecordPage.css` | All `cr-*` classes for DepEd-style tables |
| `Auth.css` | Login/signup form responsive styles |
| `CountdownOverlay.css` | Fullscreen countdown animation styles |
| `RhymeScoringStep.css` | Rhyme pair scoring UI |

### Design tokens
- **Font:** Poppins (Google Fonts)
- **Primary blue:** `#2c7fc1` / `#2c3e6b`
- **Text:** `#1a2340` (dark), `#4a5568` (muted), `#8a94b2` (light)
- **Success:** `#27ae60` / `#e8f5e9`
- **Warning:** `#e65100` / `#fff3e0`
- **Error:** `#c0392b` / `#fde8e8`

---

## 11. PWA Configuration

The app is configured as a Progressive Web App using `vite-plugin-pwa`:
- **Service Worker:** Generated in `generateSW` mode
- **Caching:** Precaches all static assets (JS, CSS, images)
- **Manifest:** App name, icons, theme color, start URL
- **Offline:** Basic offline support via cached assets

---

## 12. Environment Variables

Create a `.env` file in `frontend/`:

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/routes` |

The frontend reads this via `import.meta.env.VITE_API_BASE_URL` and configures the Axios instance accordingly.

### Production
For production builds, set `VITE_API_BASE_URL` to the deployed backend URL (e.g. `https://api.hearmeread.app/routes`).

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview  # preview the production build locally
```

---

*Last updated: 2026-05-17*
*Update this file whenever a new page, component, or configuration is added or changed.*
