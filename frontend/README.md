# HearMeRead — Frontend

React PWA for the HearMeRead oral reading fluency assessment tool.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| HTTP | Axios |
| Charts | Recharts |
| Icons | Lucide React |
| PDF Export | jsPDF + jsPDF-AutoTable |
| Excel Import | xlsx |
| DOCX Parsing | Mammoth |
| PWA | vite-plugin-pwa |
| CSS | Vanilla CSS (no UI framework) |

---

## Prerequisites

- Node.js 18 LTS or higher (Node 20 recommended)
- npm 9+
- Backend API running locally (see `Backend/README.md`)

---

## Local Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
```

> This points the frontend at the local FastAPI backend. For production, set it to your deployed backend URL.

### 3. Start the development server

```bash
npm run dev
```

The app runs at `http://localhost:5173` with hot module replacement enabled.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
frontend/
├── public/                     # Static assets (icons, manifest)
├── src/
│   ├── components/             # Shared UI components
│   │   └── component css/      # Per-component stylesheets
│   ├── data/                   # Static config (assessment constants, grade config)
│   ├── hooks/                  # Custom React hooks
│   ├── modals/                 # Modal components + stylesheets
│   ├── pages/                  # Route-level page components
│   │   ├── Assessment/         # Multi-step assessment flow steps
│   │   └── pages css/          # Per-page stylesheets
│   ├── services/
│   │   └── api.js              # All Axios API calls (authApi, adminApi, studentsApi, etc.)
│   ├── utils/                  # Helper utilities
│   ├── App.jsx                 # Router, session/idle timeout logic
│   ├── App.css
│   ├── index.css               # Global styles
│   └── main.jsx                # React entry point
├── index.html
├── vite.config.js
├── nginx.conf                  # Nginx config for Docker/production
└── nginx-ssl.conf              # SSL variant of nginx config
```

---

## Key Pages

| Route | Page | Access |
|---|---|---|
| `/` | Landing Page | Public |
| `/login` | Login | Public |
| `/signup` | Teacher Registration | Public |
| `/dashboard` | Teacher Dashboard | Teacher + Admin |
| `/students` | Student List | Teacher |
| `/students/:id` | Student Record | Teacher |
| `/students/add` | Add Student | Teacher |
| `/passages` | Passage Library | Teacher |
| `/assessment` | Assessment Flow | Teacher |
| `/profile` | Profile Page | Teacher + Admin |
| `/admin` | Admin Dashboard | Admin |
| `/admin/teachers` | Manage Teachers | Admin |
| `/admin/students` | Admin Student Records | Admin |
| `/admin/passages` | Public Passages | Admin |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the FastAPI backend |

---

## PWA

The app is configured as a Progressive Web App via `vite-plugin-pwa`. On supported browsers (Chrome, Edge, Safari on iOS), users will be prompted to install it to their home screen. The service worker handles offline caching of the app shell.

---

## Docker (Alternative)

Run the full stack (frontend + backend + nginx) from the repo root:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The frontend dev server runs at `http://localhost:5173`.  
The backend API runs at `http://localhost:8000`.

For a production-like build served via nginx:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```
