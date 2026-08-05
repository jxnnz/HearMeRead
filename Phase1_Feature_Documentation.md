# HearMeRead: Phase 1 Feature & Architecture Documentation
**Commit Range: First Commit (`97e7cfb`) to Commit `7758203`**

This document provides a comprehensive overview of the features, architectural decisions, and changes implemented during the initial development phase of the **HearMeRead** application. 

HearMeRead is an automated oral reading assessment platform designed for elementary school teachers (Grades 1–3) to conduct, score, and track student reading assessments under the DepEd Classroom Reading Level Assessment (CRLA) framework.

---

## 1. System Architecture & Foundation

During this phase, the core structure of the repository was established, establishing a decoupled frontend-backend architecture.

### 1.1 Backend Architecture
* **Framework:** Python FastAPI for high-performance, asynchronous REST APIs.
* **Data Validation:** Pydantic schemas define the data contract for API requests and responses.
* **Database & ORM:** SQLAlchemy with PostgreSQL/Supabase. Alembic was integrated for database migrations.
* **Core Services:** Initialized modular services for business logic:
  * [session_service.py](file:///c:/Users/jenny/OneDrive/Desktop/HearMeRead/Backend/app/services/session_service.py): Assessment session lifecycle (creation, tracking, completion).
  * [passage_service.py](file:///c:/Users/jenny/OneDrive/Desktop/HearMeRead/Backend/app/services/passage_service.py): Reading passage CRUD operations.
  * [student_service.py](file:///c:/Users/jenny/OneDrive/Desktop/HearMeRead/Backend/app/services/student_service.py): Student records management and lookup logic.
  * `storage_service.py`: File storage interaction.
* **Key Commits:** `402ddc6`, `f41d0cb`, `da45a42`

### 1.2 Frontend Architecture
* **Framework:** React powered by Vite for fast builds and hot module replacement.
* **Deployment Model:** Configured as a Progressive Web App (PWA) with service workers and manifest options for offline capabilities.
* **Build Configuration:** Includes legacy-peer-deps configurations and Cloudflare Pages SPA redirection rules to support seamless hosting on Cloudflare Pages.
* **Routing:** `react-router-dom` for application navigation.
* **API Client:** Axios-based client (`frontend/src/services/api.js`) to consume FastAPI endpoints.
* **Key Commits:** `ba58739`, `4cb49a4`, `7fc7b67`, `8eb48d0`

---

## 2. Core Features & Capabilities

### 2.1 Authentication & Profile Management
* **Multi-Role Support:** Signup and login flows support distinct roles for **Teachers** and **School Administrators (Admins)**.
* **Registration & Association:** Teachers link their account to their school using a 6-digit DepEd School ID. Admins register schools manually to generate a unique School Code.
* **Email Verification:** Implemented email verification upon registration using Supabase Auth.
* **Session Security:** Sets JSON Web Token (JWT) access tokens with a 240-minute expiration. Enforces user-inactivity auto-logout.
* **Profile Customization:** Profile page allows teachers to manage their details and upload a profile picture.
* **R2 Storage Integration:** Profile pictures are stored in Cloudflare R2 object storage.
* **Key Commits:** `76b59b1`, `552eb50`, `f7c06b3`, `0f4de35`, `3d02192`, `651e8ee`

### 2.2 Student Records Management
* **Student Directory:** A student grid page allows teachers to search, filter, and view student lists.
* **Student Profiles:** Detailed profile views showing total sessions, gender, grade level, and historical reading records.
* **Field-Level Encryption:** To comply with student data privacy laws, sensitive Student Personally Identifiable Information (PII) is encrypted at the field level before storing in the database.
* **PII Security Enhancements:** Built robust encryption/decryption utilities and error handling to ensure seamless data viewing while keeping database fields fully encrypted.
* **Key Commits:** `ba35a9c`, `aa13524`, `2a8d860`, `9b77f38`, `51b8f5d`

### 2.3 Reading Passage Library
* **Passages Repository:** Separate modules for Assessment 1 (screening words/sentences) and Assessment 2 (story-based reading passages).
* **CRUD API & UI:** Admin and teacher interfaces to add, edit, and view reading passages.
* **Comprehension Questions:** Allows adding comprehension questions with pre-defined answer keys for Assessment 2 stories.
* **Document Import:** Support for parsing `.docx` and `.txt` files to import passages.
* **Key Commits:** `30d894a`, `165df7c`, `57a3079`

### 2.4 Automated Reading Assessment Workflow
* **Multi-Step Assessment UI:** A structured wizard that walks the teacher through the reading assessment:
  * **Step 1: Session Info:** Select school year, period (BoSY, MoSY, EoSY), student, language, and passage. Enforces a constraint of one active session per student/year/period.
  * **Step 2: Task 1 Recording:** Record or upload audio of the student reading.
  * **Step 3: Transcription Review:** Display ASR transcription in an editable box for the teacher to review and correct.
  * **Step 4: Scoring & Routing:** Calculate results using the Levenshtein Distance algorithm to count miscues (substitutions, insertions, deletions) and route the student to the appropriate Task 2 (Lower or Higher route).
  * **Step 5: Task 2 Recording & Review:** Standard process repeated for Task 2.
  * **Step 6: Assessment 1 Summary:** Display reading level (Full Refresher, Moderate Refresher, Light Refresher, Grade Ready) and decide if the student proceeds to Assessment 2 (Story Reading).
* **Audio Storage:** Assessment audio files are uploaded and stored securely in Cloudflare R2 storage.
* **Key Commits:** `dd3f6f4`, `5b060a0`, `551e56d`, `5fd41a4`

### 2.5 Speech Processing & ASR Integration
* **Groq API Integration:** Connects backend to Groq's high-speed Whisper instance for transcribing student audio.
* **Hallucination Mitigation:** Whisper transcription prompts are injected with the original passage text, forcing the model to align with the expected vocabulary and reducing acoustic hallucinations.
* **Letter Normalizer:** Text normalization pipeline to strip punctuation, handle casing differences, and align characters to ensure fair algorithmic scoring.
* **Accuracy Engine (Levenshtein Distance):** Computes word-level alignment between the corrected transcription and original passage. Determines exact metrics (correct words, deletions, insertions, substitutions).
* **Key Commits:** `b0248e3`, `0a3f1a1`, `e6fbe0e`, `3385328`

### 2.6 Results Dashboard & Exporting
* **Analytics Widgets:** Dashboard summaries display class averages for reading speed (WPM) and accuracy.
* **Excel Exporting:** Enabled exporting student results data directly to Excel sheets.
* **A1OnlyResultsStep:** A dedicated component to handle results visualization for students who do not progress past Assessment 1.
* **Key Commits:** `587df60`, `6a9d070`, `a20ac91`

---

## 3. Security, Styling, and Infrastructure Changes

### 3.1 Content Security Policy (CSP) Updates
* Implemented strict script-src and media-src headers to block malicious script execution and safely allow loading external audio and image assets from Supabase and Cloudflare R2.
* **Key Commits:** `4e36bb7`, `4194089`, `7e7cf26`

### 3.2 UI Styling & Responsiveness
* Migrated inline styling and generic CSS to modular stylesheets grouped in pages/css and components/css.
* Implemented dark mode adjustments, custom scrollbars, stylized radio buttons, and fixed CSS casing issues to support builds on case-sensitive OS environments.
* Adjusted mobile layout margins to improve responsiveness across smartphones and tablets.
* **Key Commits:** `fa23a63`, `74c2a69`, `87ab0e9`, `ff0310d`, `7758203`

### 3.3 Infrastructure & Docker Refactoring
* Initialized a multi-environment Docker setup (dev, test, production).
* Optimized container settings by reducing worker threads (from 4 to 1) for memory efficiency in Cloudflare/container platforms, and resolved file permission errors by updating ownership of `/app` to a non-root user.
* Docker configs were eventually removed to match Cloudflare Pages (frontend) and direct hosting environments.
* **Key Commits:** `4c47af6`, `7b90711`, `9a30084`, `434f300`
