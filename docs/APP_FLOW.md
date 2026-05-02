# HearMeRead — App Flow Documentation

> This document tracks how the app works from the teacher's perspective — screen by screen, step by step.
> **Update this file every time a new feature is added or an existing flow changes.**

---

## Table of Contents

1. [Big Picture — How the App is Organized](#1-big-picture--how-the-app-is-organized)
2. [Getting In — Login and Sign Up](#2-getting-in--login-and-sign-up)
3. [Home Base — The Dashboard](#3-home-base--the-dashboard)
4. [Running an Assessment — The Core Flow](#4-running-an-assessment--the-core-flow)
   - [Step 1: Fill In the Session Info](#step-1-fill-in-the-session-info)
   - [Step 2: Assessment 1 — Gawain 1 (Task 1)](#step-2-assessment-1--gawain-1-task-1)
   - [Step 3: Review the Transcript (Task 1)](#step-3-review-the-transcript-task-1)
   - [Step 4: Task 1 Results](#step-4-task-1-results)
   - [Step 5: Assessment 1 — Gawain 2 (Task 2)](#step-5-assessment-1--gawain-2-task-2)
   - [Step 6: Review the Transcript (Task 2)](#step-6-review-the-transcript-task-2)
   - [Step 7: Task 2 Results and Routing Decision](#step-7-task-2-results-and-routing-decision)
   - [Step 8: Choose a Story for Assessment 2 (if qualified)](#step-8-choose-a-story-for-assessment-2-if-qualified)
   - [Step 9: Assessment 2 — Reading the Story](#step-9-assessment-2--reading-the-story)
   - [Step 10: Review the Transcript (Assessment 2)](#step-10-review-the-transcript-assessment-2)
   - [Step 11: Comprehension Questions](#step-11-comprehension-questions)
   - [Step 12: Observation](#step-12-observation)
   - [Step 13: Results](#step-13-results)
5. [Managing Students](#5-managing-students)
   - [Student List Page](#student-list-page)
   - [Student Profile Page](#student-profile-page)
   - [Adding a New Student](#adding-a-new-student)
6. [Managing Passages](#6-managing-passages)
   - [Passages List Page](#passages-list-page)
   - [Adding an Assessment 1 Passage](#adding-an-assessment-1-passage)
   - [Adding an Assessment 2 Passage](#adding-an-assessment-2-passage)
7. [How the Pages Connect](#7-how-the-pages-connect)
8. [Features Prepared but Currently Disabled](#8-features-prepared-but-currently-disabled)

---

## 1. Big Picture — How the App is Organized

HearMeRead is a tool for teachers to run oral reading assessments with their students. The app has four main areas:

| Area | What it's for |
|---|---|
| **Dashboard** | A quick summary of how your class is doing overall |
| **Assessment** | Where you actually run a reading session with a student |
| **Student Records** | A list of all your students and their reading history |
| **Passages** | The reading materials used during assessments |

A teacher always logs in first before they can access any of these areas. Each teacher only ever sees their own students, their own passages, and their own assessment records.

---

## 2. Getting In — Login and Sign Up

### Landing Page
When someone visits the app for the first time, they see the landing page — a welcome screen that explains what HearMeRead is about. From here, they can either **Log In** or **Register**.

### Sign Up
A new teacher fills in their first name, last name, email, and a password. The password has to meet certain strength requirements (at least 8 characters, a mix of upper and lowercase letters, a number, and a symbol). After submitting, the teacher is asked to check their email.

### Email Verification
The app sends a verification link to the teacher's email. The teacher clicks the link, and their account is confirmed. They can't log in until this step is done. If they didn't receive the email, there's an option to resend it from the login page.

### Login
The teacher enters their email and password. If everything matches and the account is verified, they are taken directly to the **Dashboard**.

### Forgot Password
If a teacher forgets their password, they can click **"Forgot password?"** on the login form. This takes them to `/forgot-password`.

1. They enter their email address and click **"Send Reset Link"**.
2. The backend creates a single-use reset token (expires in **1 hour**) and sends a reset email via Resend to that address.
3. The page always shows a success message regardless of whether the email is registered (prevents email enumeration).
4. The teacher clicks the link in their email → lands on `/reset-password?token=...`.
5. They enter a new password and confirm it. The same 5-rule strength requirements from signup apply.
6. On success, they are redirected to `/login` with a green banner: **"Password reset successfully."**
7. If the token is already used, expired, or missing, the reset page shows an error with a link back to `/forgot-password`.

**What connects here:**
- Login page → Forgot Password page → (email) → Reset Password page → Login page
- Signing up → Email verification → Login → Dashboard
- If the email is not verified yet, the login page shows a message and a resend button

---

## 3. Home Base — The Dashboard

After logging in, the teacher lands on the Dashboard. This page gives them a bird's-eye view of how their class is performing.

**What the teacher sees here:**

- **Summary cards** showing things like average reading accuracy, how many students have been assessed, and the overall error rate for the class
- **A chart** breaking down students by their reading profile (e.g., Emerging, Developing, Grade Level), split by gender
- **Fluency and comprehension charts** showing how students performed across different readings
- A **"New Session"** button that takes the teacher directly to the Assessment area to start a reading session
- An **"Export"** button that downloads a spreadsheet of the student list

**What connects here:**
- Clicking **"New Session"** goes to the Assessment page
- The sidebar on the left lets the teacher jump to any other part of the app

---

## 4. Running an Assessment — The Core Flow

The assessment is the heart of the app. It walks the teacher through a structured reading session with one student at a time. The flow has up to 13 steps, though not every student will go through all of them — it depends on how they perform.

---

### Step 1: Fill In the Session Info

Before anything is recorded, the teacher fills in the basic details of the session:

- **School Year** — Which school year this assessment belongs to
- **Assessment Period** — Beginning, Middle, or End of the school year (BoSY, MoSY, EoSY)
- **Student** — A searchable dropdown of the teacher's students. Selecting a student automatically fills in their grade and section.
- **Language** — Whether the assessment will be in Filipino or English
- **Passage** — A dropdown of available passages filtered by the selected language and grade level. Only Assessment 1 passages appear here. If only one passage matches the filters, it is selected automatically.

Once the teacher hits the start button, the session is created on the backend and the assessment begins.

**What connects here:**
- The student list comes from the teacher's registered students
- The passage list filters by both language and grade level simultaneously
- If a session for this student already exists for the same school year and assessment period, the backend will detect it (see [Section 8](#8-features-prepared-but-currently-disabled) for the duplicate guard)

---

### Step 2: Assessment 1 — Gawain 1 (Task 1)

The screen shifts to a full reading interface showing the Task 1 text. The student reads this aloud while the teacher records.

**The teacher has two ways to record:**
- **Live Recording** — Hit record, let the student read, then stop. While recording, a red indicator and a pause button appear. Pausing stops the timer without ending the recording; resuming continues both. The timer itself is not shown on screen — it runs in the background so the student is not pressured.
- **Upload a File** — If the recording was done separately, the teacher can upload the audio file. Uploading skips the recording screen and goes directly to the processing step.

After stopping, the teacher sees a quick prompt asking if they want to keep the recording or retake it.

> **Note:** Assessment 1 has no time limit. The timer only runs internally and is never shown to the student.

**What connects here:**
- The Task 1 text shown on screen comes from the passage selected in Step 1
- After the recording is accepted, the audio is automatically sent to the transcription step

---

### Step 3: Review the Transcript (Task 1)

The app processes the audio and converts what the student said into text (using the Whisper ASR model — `medium` for Filipino, `base` for English). This is shown to the teacher in an editable box so they can correct any mistakes the transcription made.

A warning banner is always shown at the top of this screen reminding the teacher to check the transcription carefully, since the model is not perfect.

Once the teacher confirms the transcript, the app compares it to the original Task 1 text and computes the score using Levenshtein alignment on the backend.

**What connects here:**
- The transcript is compared word-by-word against the passage text on the backend
- After confirming, the app goes to the results for Task 1

---

### Step 4: Task 1 Results

The teacher sees a breakdown of how the student did on Task 1:

- Total words in the passage
- How many words were read correctly
- Total time taken

The app uses this score to decide what version of Task 2 the student should take. This decision happens automatically based on the backend's scoring — the teacher does not need to do anything.

**What connects here:**
- Task 1 score ≤ 6 → Task 2 will be a simple rhyme/word list (lower route, Task 2L)
- Task 1 score > 6 → Task 2 will be a set of sentences (higher route, Task 2H)
- The teacher clicks Continue to proceed to Task 2

---

### Step 5: Assessment 1 — Gawain 2 (Task 2)

Same recording interface as Task 1, but the content is different based on the routing decision from Step 4:
- **Lower route (Task 2L):** The student reads a list of individual words
- **Higher route (Task 2H):** The student reads a set of sentences

The recording process is the same — live record or upload, with the option to retake.

---

### Step 6: Review the Transcript (Task 2)

Same as Step 3 — the teacher sees the transcribed text and can edit it before confirming. The same warning banner is shown. After confirming, the backend scores Task 2 together with Task 1 and returns a final Assessment 1 classification.

---

### Step 7: Task 2 Results and Routing Decision

The teacher sees the Task 2 results and the combined Assessment 1 summary:

- Task 1 score
- Total words in the passage
- Words read correctly in Task 2
- Total time
- **Assessment 1 Classification** badge — one of:
  - **Full Refresher**
  - **Moderate Refresher**
  - **Light Refresher**
  - **Grade Ready**

The app then determines whether the student qualifies to continue to Assessment 2.

- **Students on the higher route (Task 2H)** who score well enough are eligible for Assessment 2
- **Students on the lower route (Task 2L)** do not proceed to Assessment 2

**What connects here:**
- Eligible students → Step 8 (Story Selection for Assessment 2)
- Not eligible → Step 12 (Observation — standalone screen)

---

### Step 8: Choose a Story for Assessment 2 (if qualified)

A grid of story cards appears, showing available Assessment 2 passages filtered to the student's grade level. Each card shows the story title and word count. The teacher picks which story to use for the reading.

**What connects here:**
- Only stories matching the student's grade level are shown
- After selecting a story, the reading session continues with Assessment 2

---

### Step 9: Assessment 2 — Reading the Story

The student reads the full story aloud while the teacher records. This step has a time limit based on the student's grade level:

| Grade | Time Limit |
|---|---|
| Grade 1 | 60 seconds |
| Grade 2 | 120 seconds |
| Grade 3 | 180 seconds |

When the time limit is reached, a message pops up asking the teacher to either let the student continue or stop and submit what was recorded. The timer pauses while this message is open.

> **Note:** As in Assessment 1, the recording timer is not shown on screen — it runs in the background and only triggers the time-limit pop-up when the grade-level threshold is reached.

---

### Step 10: Review the Transcript (Assessment 2)

Same transcript review process as before. The same warning banner is shown. Words read up to the time limit may be highlighted in blue so the teacher can see the cut-off point. The teacher edits if needed and confirms.

---

### Step 11: Comprehension Questions

After the reading, the teacher asks the student comprehension questions about the story. Each question appears on screen, and the teacher marks the student's answer as:

- **Correct**
- **Wrong**
- **N/A** (question was not asked)

The teacher must respond to all questions before moving on. After submitting, the app goes to the Observation step.

**What connects here:**
- The questions shown here come from the Assessment 2 passage selected in Step 8
- The number of correct answers feeds into the final reading profile calculation

---

### Step 12: Observation

The teacher records their observation about how the student read. This is a standalone screen that appears:
- **After Task 2 results** — for students who did not qualify for Assessment 2
- **After Comprehension questions** — for students who completed Assessment 2

The teacher fills in:

- **Observation Level (1–4):**
  - Level 1 — Frustration (reads word by word, many errors)
  - Level 2 — Instructional (reads in chunks, some errors)
  - Level 3 — Independent (reads fluently but may ignore punctuation)
  - Level 4 — Advanced (reads fluently with proper expression)

- **Remarks** — An optional free-text box for the teacher's personal notes about the session

After saving, the app submits the observation to the backend and moves to the final results.

**What connects here:**
- The observation is saved independently — it does not complete the session; it just records the teacher's rating
- After submitting, non-A2 students go directly to Results; A2 students also go to Results

---

### Step 13: Results

The final screen shows a full summary of the session:

- **Reading Profile** — The student's overall reading level based on all scores (from backend)
- **Key stats** — Story read, number of miscues, words read within the time limit, time used, words per minute, comprehension score, observation level
- **Reading profile description** — A plain-language explanation of what the reading profile means
- **Teacher's remarks** — The notes saved from the Observation step
- **Export to Excel** — Download a detailed spreadsheet of the full assessment
- **Print** — Print the results page directly

**Reading profile tiers (determined by the backend):**

| Profile | Criteria |
|---|---|
| Low Emerging Reader | Did not reach Assessment 2 (scored 0–10 on Assessment 1) |
| High Emerging Reader | Reached A2; read <25% of passage within time limit; 0 correct answers |
| Developing Reader | 26–50% of passage; 1–2 correct answers |
| Transitioning Reader | 51–75% of passage; 3–4 correct answers |
| Reading at Grade Level | 76–100% of passage; 5–6 correct answers |

**What connects here:**
- From here, the teacher can start a new session or navigate elsewhere via the sidebar
- The results are saved under the student's profile and can be viewed later in the Student Records section

---

## 5. Managing Students

### Student List Page

This page shows all of the teacher's students in a grid of cards. Each card shows:

- The student's full name
- LRN number
- Grade level badge
- Reading profile badge (pulled from the student's most recent completed assessment — blank if no assessment done yet)
- Number of sessions taken

**The teacher can:**
- Search by name or LRN number
- Filter by grade level or reading profile
- Sort alphabetically
- Click on any student card to open their profile
- Click "Add Student" to register a new student

---

### Student Profile Page

Clicking on a student opens their full profile. This page has three main parts:

1. **Student Info Card** — Name, grade, section, LRN, and sex. There's an Edit button to update details and a Delete button to remove the student entirely.

2. **Stats Bar** — A quick summary showing total assessments taken, average accuracy, average words per minute, and the latest observation level.

3. **Assessment History Table** — A list of every assessment session for that student, showing:
   - When it was done and which period (BoSY, MoSY, EoSY)
   - The language used
   - Assessment 1 scores (Task 1, Task 2, total score, and classification)
   - Assessment 2 metrics (story title, number of miscues, words read, WPM, time, percentage of correct words, total correct answers, observation level, reading profile, remarks)
   - A **Delete** button to remove a specific record (no Edit — records are view/delete only)

The table can be filtered by language or period, searched by keyword, sorted by any column, exported to Excel, or printed.

**What connects here:**
- Editing a student opens a small edit window (modal) right on the same page
- Deleting a student or a session record asks for confirmation before removing
- The assessment history links back to sessions that were created during the Assessment flow

---

### Adding a New Student

Clicking "Add Student" on the list page opens a simple form:

- LRN (Learner Reference Number)
- Sex
- First Name and Last Name
- Grade Level
- Section

After saving, the student appears in the list and can be selected for an assessment.

---

## 6. Managing Passages

Passages are the reading texts used during assessments. The teacher manages them here.

### Passages List Page

This page is split into two sections:
- **Assessment 1 Passages** — Used for Task 1 and Task 2 in the oral reading assessment
- **Assessment 2 Passages** — The full stories used for the main reading and comprehension check

Each passage card shows the title and word count. The teacher can edit or remove any passage from this page.

---

### Adding an Assessment 1 Passage

The teacher fills in:
- **Language** — Filipino or English
- **Grade Level** — Grade 1, 2, or 3
- **Task 1 Text** — The passage the student reads for the first task
- **Task 2 — Words** — A comma-separated list of words for the lower-route version of Task 2
- **Task 2 — Sentences** — Period-separated sentences for the higher-route version of Task 2

---

### Adding an Assessment 2 Passage

The teacher fills in:
- **Title** — The story name
- **Grade Level and Language**
- **Story Content** — The full passage text. The app automatically counts the words.
- **Comprehension Questions** — The teacher adds at least one question. They can add or remove questions from the list.

---

## 7. How the Pages Connect

Below is a map of how the pages flow into each other:

```
Landing Page
├── → Login Page
│     ├── → Dashboard (after successful login)
│     └── → Forgot Password Page
│               └── → (email sent) → Reset Password Page
│                         └── → Login Page (with success banner)
└── → Sign Up Page
      └── → (email sent) → Login Page

Dashboard
├── → Assessment (via "New Session" button)
├── → Student Records (via sidebar)
├── → Passages (via sidebar)
└── → Assessment (via sidebar)

Assessment (up to 13 steps)
│
├── INFO (Step 1: session setup)
│
├── A1_G1 → A1_G1_LOADING → A1_G1_PREVIEW → A1_G1_RESULT (Task 1)
│
├── A1_G2 → A1_G2_LOADING → A1_G2_PREVIEW → A1_G2_RESULT (Task 2)
│
├── [If not A2-eligible] → OBSERVATION → RESULTS
│
└── [If A2-eligible]
      └── A2_SELECT → A2 → A2_LOADING → A2_PREVIEW
            → COMPREHENSION → OBSERVATION → RESULTS

Notes:
- Upload mode skips the reading page, going directly to LOADING
- OBSERVATION is a standalone step for both paths (A1-only and A2)

Student Records (List)
├── → Student Profile (click a student card)
│     ├── → Edit Student (modal on same page)
│     ├── → Delete Record (confirmation modal)
│     └── → Delete Student (confirmation modal)
└── → Add Student Page

Passages
├── → Add Assessment 1 Passage page
└── → Add Assessment 2 Passage page

Sidebar (always visible after login)
├── → Dashboard
├── → Assessment
├── → Passages
├── → Student Records
└── → Logout (with confirmation)
```

---

## 8. Features Prepared but Currently Disabled

These features are built into the code but commented out. They can be enabled by uncommenting the relevant sections.

### Duplicate Session Guard

**What it does:** Prevents a teacher from creating more than one assessment for the same student in the same school year and assessment period.

**When enabled:**
- If the teacher tries to start a new session for a student who already has one for the same period and school year, the backend returns a `409 Conflict` error and the session is not created.
- A warning banner appears on the session info screen explaining why the session was blocked.

**Where the code lives:**
- **Backend block:** `Backend/app/routes/session.py` — inside `create_session()`, the commented block calls `session_service.check_duplicate()` and raises `HTTPException(409)` if a match is found.
- **Frontend warning state:** `frontend/src/pages/Assessment/AssessmentPage.jsx` — `duplicateWarning` state and detection logic inside `handleContinue()`.
- **Frontend warning banner:** Same file, inside the `INFO` step render block.
- **CSS:** `frontend/src/pages/pages css/AssessmentPage.css` — `.asp-duplicate-warning` style (amber/yellow tone).

**How to enable:** Uncomment all four sections listed above.

> **Note:** The backend already detects duplicates even while this guard is disabled. Without it, a duplicate session is still created and the API returns HTTP 207 (with a `warning` field in the response body). The guard simply converts that from a soft warning into a hard block.

---

*Last updated: 2026-05-02*
*Update this file whenever a new page, step, or flow is added or changed.*
