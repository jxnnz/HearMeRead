import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Download, Search, Menu, X, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import Layout from '../components/Layout';
import './pages css/UserManualPage.css';

const SECTIONS = [
  { id: 'introduction', title: '1. Introduction', subsections: [] },
  { id: 'getting-started', title: '2. Getting Started', subsections: [
    { id: 'creating-account', title: '2.1 Creating an Account' },
    { id: 'email-verification', title: '2.2 Email Verification' },
    { id: 'logging-in', title: '2.3 Logging In' },
    { id: 'forgot-password', title: '2.4 Forgot Your Password' }
  ] },
  { id: 'teacher-guide', title: '3. Teacher Guide', subsections: [
    { id: 'dashboard', title: '3.1 The Dashboard' },
    { id: 'before-you-start', title: '3.2 Before You Start' },
    { id: 'running-assessment', title: '3.3 Running an Assessment' },
    { id: 'managing-students', title: '3.4 Managing Students' },
    { id: 'managing-passages', title: '3.5 Managing Passages' },
    { id: 'class-record', title: '3.6 Class Record' },
    { id: 'your-profile', title: '3.7 Your Profile' }
  ] },
  { id: 'admin-guide', title: '4. Admin Guide', adminOnly: true, subsections: [
    { id: 'admin-dashboard', title: '4.1 Admin Dashboard' },
    { id: 'managing-teachers', title: '4.2 Managing Teachers' },
    { id: 'admin-student-records', title: '4.3 Student Records' },
    { id: 'public-passages', title: '4.4 Public Passages' }
  ] },
  { id: 'faq', title: '5. Frequently Asked Questions', subsections: [] }
];

export default function UserManualPage() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('role') === 'ADMIN';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef(null);

  const visibleSections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

  const filteredSections = visibleSections.filter(section => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    if (section.title.toLowerCase().includes(q)) return true;
    return section.subsections.some(sub => sub.title.toLowerCase().includes(q));
  });

  useEffect(() => {
    const allIds = visibleSections.flatMap(s => [s.id, ...s.subsections.map(sub => sub.id)]);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isAdmin, visibleSections]);

  useEffect(() => {
    const wrapper = contentRef.current;
    if (!wrapper) return;
    const handleScroll = () => setShowScrollTop(wrapper.scrollTop > 300);
    wrapper.addEventListener('scroll', handleScroll);
    return () => wrapper.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSidebarOpen(false);
  }, []);

  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  function handleDownloadManual() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    const pageHeight = 297;
    const pageWidth = 210;
    const maxW = pageWidth - (margin * 2);
    let y = margin;

    function checkPageBreak(neededHeight) {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin + 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.text("HearMeRead — User Manual", margin, margin - 5);
        doc.setDrawColor(230, 235, 245);
        doc.line(margin, margin - 3, pageWidth - margin, margin - 3);
      }
    }

    let manualText = `# HearMeRead — User Manual
A Speech Processing Framework for Automated Oral Reading
Version 1.0 · May 2026

Supported Grades: Grade 1, Grade 2, and Grade 3 — Filipino and English
Framework: DepEd Classroom Reading Level Assessment (CRLA)

=========================================
1. INTRODUCTION
=========================================
HearMeRead is an automated oral reading assessment tool designed for elementary school teachers in Grades 1 to 3. It helps teachers conduct, record, score, and track reading assessments following the DepEd Classroom Reading Level Assessment (CRLA) framework.

With HearMeRead, you can:
- Record a student reading aloud and automatically transcribe the audio.
- Score the reading against the passage text to identify miscues — substitutions, insertions, and deletions.
- Classify the student's reading level (Full Refresher, Moderate Refresher, Light Refresher, Grade Ready).
- Track student reading profiles across the school year (Beginning, Middle, and End of School Year).
- Export results to Excel or PDF for DepEd reporting.

Role Responsibilities:
- Teacher: Conducts assessments, manages students and class passages, views class records, and exports results.
- Admin: Oversees all teachers and classes at the school, manages teacher class assignments, and manages the school-wide public passage library.

=========================================
2. GETTING STARTED
=========================================
2.1 Creating an Account
1. Go to the HearMeRead website and click Register.
2. On the sign-up form, toggle your role between Teacher and Admin.
3. Fill in your First Name and Last Name.
4. Set your school association:
   - If registering as a Teacher: Enter your school's DepEd School ID (6-digit number) or the School Code provided by your admin. The system will look up the school automatically and lock in the School Name.
   - If registering as an Admin: Enter the School Name and DepEd School ID manually. Upon successful sign-up, the system will generate a unique School Code for your school.
5. Enter your email address and password.
6. Check the Terms and Conditions and Data Privacy boxes, then click Register.

* Note: Password Requirements: At least 8 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. !@#$).

2.2 Email Verification
1. Open your email inbox and locate the message from HearMeRead.
2. Click the verification link in the email.
3. You will be redirected to a confirmation page. Once verified, you can log in.

* Warning: The email verification link expires after 24 hours. If it expires, click "Resend verification email" on the login page and enter your email address.

2.3 Logging In
1. Go to the HearMeRead website and click Log In.
2. Enter your email address and password, then click Log In.
3. Teachers are redirected to the Teacher Dashboard; Admins go to the Admin Dashboard.

* Important: Your session stays active for up to 4 hours. However, if you are inactive (no mouse movement, scrolling, or typing) for 30 minutes, you will be automatically logged out to protect student data.

2.4 Forgot Your Password
1. On the login page, click Forgot password?
2. Enter your registered email address and click Send Reset Link.
3. Check your email for a message from HearMeRead, click the reset link, and enter a new password.

=========================================
3. TEACHER GUIDE
=========================================
3.1 The Dashboard
The Teacher Dashboard presents a summary of your class's oral reading performance:
- Summary Cards: Shows average reading accuracy, number of students assessed, and the overall error rate.
- Reading Profile Chart: Displays the distribution of students by reading level, split by gender.
- Fluency Chart: Tracks average words-per-minute (WPM) across school year assessment periods.
- New Session Button: Starts a new oral reading assessment.

The left sidebar navigation links are: Dashboard, Assessment, Passages, Student Records, My Profile, and Logout.

3.2 Before You Start — What You Need First
* Important: Before running your first assessment, make sure you have completed these steps. Missing any of them will prevent you from starting a session.

1. Make sure your class is assigned. Your school admin must assign you a grade level and section first. Check under My Profile → "Assignment Information". If it says "Unassigned", contact your school admin and ask them to assign your class.
2. Add your students to the system. You cannot run an assessment without students. Go to Student Records in the sidebar and add students either manually or by importing from Excel — see Section 3.4 below for detailed instructions.
3. Add or check your reading passages. You need at least one Assessment 1 passage before you can start. Go to Passages in the sidebar and either add a passage manually, upload a document file, or check if your admin has already added public passages for your grade level — see Section 3.5.
4. Prepare the student and environment. Assessments are done one-on-one. Seat the student in a quiet area with the device (laptop, tablet, or phone) in front of them. Make sure the device microphone is working.
5. Allow microphone access. Before the first recording, your browser will ask for microphone permission. Click Allow. If you accidentally blocked it, go to your browser's site settings and re-enable microphone access for the HearMeRead website.

3.3 Running an Assessment
Assessments are conducted one-on-one. The total assessment takes around 3 to 5 minutes per student (up to 10 minutes depending on the student's reading speed). Click New Session on the dashboard or Assessment in the sidebar to begin.

Step 1: Session Setup
Fill in the details for this assessment:
- School Year: Select from the dropdown (e.g. "2025-2026").
- Assessment Period: Choose Beginning of School Year (BoSY), Middle (MoSY), or End (EoSY).
- Student: Search and select the student from the dropdown list.
- Language: Select Filipino or English.
- Passage: Select from available passages for the chosen language.
* Note: Grade level and section are pre-filled automatically based on your teacher profile. The student dropdown automatically excludes students who have already completed an assessment for the chosen school year and period to avoid duplicate assessments.

Step 2: Assessment 1, Task 1 — Recording
The reading text for Task 1 is shown on screen.
- Click the Record button. A 3-second countdown overlay appears before recording starts.
- The student reads aloud. A red indicator shows the recording is live.
- You can Pause and Resume at any time during recording.
- When the student finishes, click Stop.
- A confirmation prompt asks if you want to keep the recording or retake it.
- Alternative: If you recorded the audio separately (on a phone or recorder), click Upload and select the audio file. Supported formats: MP3, WAV, M4A, OGG, WebM.

Step 3: Review the Transcript — Task 1
The system processes the audio using speech-to-text. The transcribed text appears in an editable text box.
- Important: Carefully review the transcript word by word. The speech recognition is not perfect, especially for Filipino words.
- Correct any mis-transcriptions by clicking on the text and typing your edits directly.
- When the transcript matches what the student actually said, click Confirm.
* Warning: Always double-check the transcript. Errors in the transcript will affect the student's score. Take a moment to listen and verify.

Step 4: Task 1 Results & Routing
The system scores Task 1 and automatically determines the route for Task 2:
- Filipino (6 or fewer correct): Lower Route (Task 2L). Grade 1: Rhyme Pairs (no recording); Grades 2-3: Simpler Word List (recorded).
- Filipino (More than 6 correct): Higher Route (Task 2H). Set of Sentences (recorded).
- English (0 correct): Assessment Ends. Assessment ends; classified as Full Refresher.
- English (1 or more correct): Lower Route (Task 2L). Word List (recorded).
* Note: Grade 1 Filipino on the lower route: Task 2 is a rhyme identification task. You (the teacher) read each word pair aloud and mark Oo if they rhyme, or Hindi if they do not. No audio is recorded for this step.

Step 5: Assessment 1, Task 2 — Recording
The recording, transcription review, and confirmation process is the same as Task 1. The only difference is the content shown — it will be either a word list or sentences, depending on the route.

Step 6: Assessment 1 Results
The combined Task 1 + Task 2 scores determine the Assessment 1 Classification:
- Full Refresher: The learner needs intensive reading intervention.
- Moderate Refresher: The learner needs significant reading support.
- Light Refresher: The learner is nearly ready for grade-level reading.
- Grade Ready: The learner is ready for grade-level reading.

The system then decides if the student continues to Assessment 2:
- Proceeds to Assessment 2: Students on the higher route (sentences) who score above the threshold.
- Skips to Observation: Students on the lower route (words/rhymes) skip Assessment 2 entirely.

Step 7: Choose a Story for Assessment 2
If the student qualifies, you will see a grid of story cards. Each card shows the story title and word count. Select a story for the student to read.

Step 8: Assessment 2 — Story Reading
The student reads the full story aloud while you record. A grade-level time limit applies:
- Grade 1: 1 minute (60 seconds)
- Grade 2: 2 minutes (120 seconds)
- Grade 3: 3 minutes (180 seconds)
* Important: The timer is not visible to the student. When the time limit is reached, the recording automatically pauses and a prompt asks whether to let the student continue or stop. If you continue, the recording resumes, but words read past the limit are tracked separately and will not inflate the student's fluency score.

Step 9: Review the Transcript — Assessment 2
Verify the transcript against the story text. Words read within the time limit are highlighted in blue. Make any corrections and click Confirm.

Step 10: Comprehension Questions
Ask the student each comprehension question shown on the screen (6 questions total). Mark each answer: Correct, Wrong, or N/A.

Step 11: Learner Experience Rating
Hand the device to the student and have them tap the emoji face that best describes how they felt: Very Hard, Struggled, Okay, Good, or Excellent.

Step 12: Observation & Remarks
Record your observation of how the student read:
- Level 1: Reads word by word.
- Level 2: Reads in word chunks.
- Level 3: Reads fluently but does not observe punctuation marks.
- Level 4: Reads fluently with proper expression.
You may add optional remarks before clicking Save.

Step 13: Final Results
Reading Profiles are determined by accuracy percentage and comprehension score:
- Low Emerging Reader: Did not reach Assessment 2 (Part 1 score is 10 or below).
- High Emerging Reader: Reached Assessment 2 but read very little (accuracy below 25% or comprehension = 0).
- Developing Reader: Read 25%-50% correctly; comprehension score of 1-2.
- Transitioning Reader: Read 51%-75% correctly; comprehension score of 3-4.
- Reading at Grade Level: Read more than 75% correctly; comprehension score of 5-6.
* Tip: If accuracy and comprehension fall into different levels, the system uses accuracy as a tiebreaker. From the results screen, you can print the report as a PDF, export to Excel, or start a new session.

3.4 Managing Students
* Important: Before adding students, prepare their LRN (12-digit number), full name, sex, grade level, and section.

Option A — Adding a Single Student Manually
1. Click Student Records in the left sidebar.
2. Click the Add Student button.
3. Fill in the form and click Save.

Option B — Importing Multiple Students from Excel
1. Click Student Records in the left sidebar.
2. Click the Import Students button.
3. Prepare an Excel file (.xlsx) with these exact column headers: LRN, First Name, Last Name, Sex, Grade Level, Section.
4. Upload the file. Fix any errors highlighted in red, then click Import.

3.5 Managing Passages
Click Passages in the sidebar.
- Public Library: Public passages provided by your school admin (read-only).
- Adding Passages Manually: Fill in the text fields and click Save.
- Document Import: Drag and drop a .docx or .txt file into the upload modal.
- Download Template: Inside the upload modal, click Download Template for a pre-formatted template.
- Bulk Upload: You can select and upload multiple document files at once.

3.6 Class Record
The Class Record provides a spreadsheet-style view of your class's assessment results.
1. Go to Student Records in the sidebar.
2. Click the Class Record button.
3. Filter by School Year, Assessment Period, and Language.

3.7 Your Profile
Click My Profile in the sidebar.
- Editable Fields: First Name, Last Name, Profile Picture.
- Locked Fields: Employee ID (max 7 characters). School details, Grade, and Section are assigned by your school admin.
* Warning: Once you save your Employee ID, it cannot be changed. If you made a mistake, contact system support.
`;

    if (isAdmin) {
      manualText += `
=========================================
4. ADMIN GUIDE
=========================================
4.1 Admin Dashboard
The Admin Dashboard displays school-wide performance statistics: Total Teachers, Students Assessed, Total Sessions, Completion Rate, and your School Code.

4.2 Managing Teachers
Click Teachers in the sidebar.
- Assigning a Class: Find the teacher, click Assign, select the School Year, Grade Level, and enter the Section.
- Editing a Teacher's Assignment: Click the Edit button on the teacher's row.
- Archiving a Teacher: Click the Archive button. Their account will be deactivated.
- Viewing Activity Logs: Click the Logs button to view detailed actions with timestamps.

4.3 Viewing Student Records
Click Student Records in the sidebar to see school-wide classes grouped by school year. Records are read-only for admins.

4.4 Managing Public Passages
Admins can add, edit, or archive public passages. Public passages are distributed to all teachers whose assigned grade and language match the passage.
`;
    }

    manualText += `
=========================================
5. FREQUENTLY ASKED QUESTIONS
=========================================
Q: Why is the school name read-only during registration?
A: As a teacher, once you enter a valid School Code or DepEd School ID, the system looks up the school in the database and automatically fills in the school name. This ensures all teachers are correctly grouped under the same school.

Q: Can I edit my Employee ID if I typed it wrong?
A: No. Once you save your Employee ID on the profile page, it is permanently locked to secure teacher identities. If you made a mistake, please contact system support to reset it.

Q: What happens if the student reads past the time limit in Assessment 2?
A: The system automatically pauses when the time limit (60s, 120s, or 180s) is reached. If you click continue, the recording resumes, but the words read past the limit are tracked separately and do not inflate the student's Correct Words Per Minute (CWPM) score.

Q: Why do English students skip Assessment 2?
A: Following the CRLA guidelines, English assessments do not have a sentences route (Task 2H) or connected story reading (Assessment 2). English students complete Task 2 Words and then proceed straight to Observation and results.

Q: How do I upload rhyming word pairs for Grade 1 Filipino?
A: Click the Download Template button in the upload modal. The template shows the correct structure: word1, word2|Oo or word1, word2|Hindi on separate lines under the Task 2 section.
`;

    const lines = manualText.split("\n");

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        y += 2.5;
        return;
      }

      if (line.startsWith("===") || line.startsWith("---")) {
        return;
      }

      if (line.startsWith("# ")) {
        const text = line.replace("# ", "").replace(/—/g, "-");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(26, 35, 64);
        
        const wrapped = doc.splitTextToSize(text, maxW);
        checkPageBreak(wrapped.length * 8 + 4);
        wrapped.forEach((l) => {
          doc.text(l, margin, y);
          y += 8;
        });
        y += 2;
      } else if (line.match(/^[1-5]\.\s+[A-Z\s&#;]+$/) && line === line.toUpperCase()) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(44, 62, 107);
        
        const wrapped = doc.splitTextToSize(line, maxW);
        checkPageBreak(wrapped.length * 6 + 4);
        y += 2;
        wrapped.forEach((l) => {
          doc.text(l, margin, y);
          y += 6;
        });
        y += 2;
      } else if (line.match(/^[1-5]\.[0-9]/)) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(44, 62, 107);
        
        const wrapped = doc.splitTextToSize(line, maxW);
        checkPageBreak(wrapped.length * 5 + 3);
        y += 1.5;
        wrapped.forEach((l) => {
          doc.text(l, margin, y);
          y += 5;
        });
        y += 1.5;
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(60, 65, 80);
        
        const text = line.substring(2);
        const bullet = "• ";
        const bulletW = doc.getTextWidth(bullet);
        const wrapped = doc.splitTextToSize(text, maxW - 6);
        checkPageBreak(wrapped.length * 5 + 1);
        
        doc.text(bullet, margin + 2, y);
        wrapped.forEach((l) => {
          doc.text(l, margin + 2 + bulletW, y);
          y += 5;
        });
        y += 0.5;
      } else if (line.match(/^[0-9]+\.\s+/)) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(60, 65, 80);
        
        const dotIdx = line.indexOf(".");
        const numPrefix = line.substring(0, dotIdx + 2);
        const text = line.substring(dotIdx + 2);
        const prefixW = doc.getTextWidth(numPrefix);
        const wrapped = doc.splitTextToSize(text, maxW - 6);
        checkPageBreak(wrapped.length * 5 + 1);
        
        doc.text(numPrefix, margin + 2, y);
        wrapped.forEach((l) => {
          doc.text(l, margin + 2 + prefixW, y);
          y += 5;
        });
        y += 0.5;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(60, 65, 80);
        
        const wrapped = doc.splitTextToSize(line, maxW);
        checkPageBreak(wrapped.length * 5 + 1);
        wrapped.forEach((l) => {
          doc.text(l, margin, y);
          y += 5;
        });
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 160);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    doc.save("HearMeRead_User_Manual.pdf");
  }

  const renderContent = () => (
    <>
      <div id="introduction" className="um-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="um-section-title">1. Introduction</h2>
        <p className="um-text">
          HearMeRead is an automated oral reading assessment tool designed for elementary school teachers in Grades 1 to 3. It helps teachers conduct, record, score, and track reading assessments following the DepEd Classroom Reading Level Assessment (CRLA) framework.
        </p>
        <p className="um-text">With HearMeRead, you can:</p>
        <ul className="um-list">
          <li>Record a student reading aloud and automatically transcribe the audio.</li>
          <li>Score the reading against the passage text to identify miscues — substitutions, insertions, and deletions.</li>
          <li>Classify the student's reading level (Full Refresher, Moderate Refresher, Light Refresher, Grade Ready).</li>
          <li>Track student reading profiles across the school year (Beginning, Middle, and End of School Year).</li>
          <li>Export results to Excel or PDF for DepEd reporting.</li>
        </ul>
        <p className="um-text">Role Responsibilities:</p>
        <ul className="um-list">
          <li>Teacher: Conducts assessments, manages students and class passages, views class records, and exports results.</li>
          <li>Admin: Oversees all teachers and classes at the school, manages teacher class assignments, and manages the school-wide public passage library.</li>
        </ul>
      </div>

      <div id="getting-started" className="um-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="um-section-title">2. Getting Started</h2>
        
        <div id="creating-account" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">2.1 Creating an Account</h3>
          <p className="um-text">Step-by-step:</p>
          <ol className="um-list">
            <li>Go to the HearMeRead website and click Register.</li>
            <li>On the sign-up form, toggle your role between Teacher and Admin.</li>
            <li>Fill in your First Name and Last Name.</li>
            <li>Set your school association:
              <ul className="um-list">
                <li>If registering as a Teacher: Enter your school's DepEd School ID (6-digit number) or the School Code provided by your admin. The system will look up the school automatically and lock in the School Name.</li>
                <li>If registering as an Admin: Enter the School Name and DepEd School ID manually. Upon successful sign-up, the system will generate a unique School Code for your school.</li>
              </ul>
            </li>
            <li>Enter your email address and password.</li>
            <li>Check the Terms and Conditions and Data Privacy boxes, then click Register.</li>
          </ol>
          <div className="um-callout um-callout--note">
            <strong>Note:</strong> Password Requirements: At least 8 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. !@#$).
          </div>
        </div>

        <div id="email-verification" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">2.2 Email Verification</h3>
          <ol className="um-list">
            <li>Open your email inbox and locate the message from HearMeRead.</li>
            <li>Click the verification link in the email.</li>
            <li>You will be redirected to a confirmation page. Once verified, you can log in.</li>
          </ol>
          <div className="um-callout um-callout--warning">
            <strong>Warning:</strong> The email verification link expires after 24 hours. If it expires, click "Resend verification email" on the login page and enter your email address.
          </div>
        </div>

        <div id="logging-in" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">2.3 Logging In</h3>
          <ol className="um-list">
            <li>Go to the HearMeRead website and click Log In.</li>
            <li>Enter your email address and password, then click Log In.</li>
            <li>Teachers are redirected to the Teacher Dashboard; Admins go to the Admin Dashboard.</li>
          </ol>
          <div className="um-callout um-callout--important">
            <strong>Important:</strong> Your session stays active for up to 4 hours. However, if you are inactive (no mouse movement, scrolling, or typing) for 30 minutes, you will be automatically logged out to protect student data.
          </div>
        </div>

        <div id="forgot-password" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">2.4 Forgot Your Password</h3>
          <ol className="um-list">
            <li>On the login page, click Forgot password?</li>
            <li>Enter your registered email address and click Send Reset Link.</li>
            <li>Check your email for a message from HearMeRead, click the reset link, and enter a new password.</li>
          </ol>
        </div>
      </div>

      <div id="teacher-guide" className="um-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="um-section-title">3. Teacher Guide</h2>

        <div id="dashboard" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">3.1 The Dashboard</h3>
          <p className="um-text">The Teacher Dashboard presents a summary of your class's oral reading performance:</p>
          <ul className="um-list">
            <li>Summary Cards: Shows average reading accuracy, number of students assessed, and the overall error rate.</li>
            <li>Reading Profile Chart: Displays the distribution of students by reading level, split by gender.</li>
            <li>Fluency Chart: Tracks average words-per-minute (WPM) across school year assessment periods.</li>
            <li>New Session Button: Starts a new oral reading assessment.</li>
          </ul>
          <p className="um-text">The left sidebar navigation links are: Dashboard, Assessment, Passages, Student Records, My Profile, and Logout.</p>
        </div>

        <div id="before-you-start" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">3.2 Before You Start — What You Need First</h3>
          <div className="um-callout um-callout--important">
            <strong>Important:</strong> Before running your first assessment, make sure you have completed these steps. Missing any of them will prevent you from starting a session.
          </div>
          <p className="um-text">Checklist:</p>
          <ol className="um-checklist">
            <li>Make sure your class is assigned. Your school admin must assign you a grade level and section first. Check under My Profile → "Assignment Information". If it says "Unassigned", contact your school admin and ask them to assign your class.</li>
            <li>Add your students to the system. You cannot run an assessment without students. Go to Student Records in the sidebar and add students either manually or by importing from Excel — see Section 3.4 below for detailed instructions.</li>
            <li>Add or check your reading passages. You need at least one Assessment 1 passage before you can start. Go to Passages in the sidebar and either add a passage manually, upload a document file, or check if your admin has already added public passages for your grade level — see Section 3.5.</li>
            <li>Prepare the student and environment. Assessments are done one-on-one. Seat the student in a quiet area with the device (laptop, tablet, or phone) in front of them. Make sure the device microphone is working.</li>
            <li>Allow microphone access. Before the first recording, your browser will ask for microphone permission. Click Allow. If you accidentally blocked it, go to your browser's site settings and re-enable microphone access for the HearMeRead website.</li>
          </ol>
        </div>

        <div id="running-assessment" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">3.3 Running an Assessment</h3>
          <p className="um-text">
            Assessments are conducted one-on-one. The total assessment takes around 3 to 5 minutes per student (up to 10 minutes depending on the student's reading speed). Click New Session on the dashboard or Assessment in the sidebar to begin.
          </p>
          
          <div className="um-step-card">
            <div className="um-step-number">Step 1</div>
            <div className="um-step-title">Session Setup</div>
            <div className="um-step-body">
              <p className="um-text">Fill in the details for this assessment:</p>
              <ul className="um-list">
                <li>School Year: Select from the dropdown (e.g. "2025-2026").</li>
                <li>Assessment Period: Choose Beginning of School Year (BoSY), Middle (MoSY), or End (EoSY).</li>
                <li>Student: Search and select the student from the dropdown list.</li>
                <li>Language: Select Filipino or English.</li>
                <li>Passage: Select from available passages for the chosen language.</li>
              </ul>
              <div className="um-callout um-callout--note">
                <strong>Note:</strong> Grade level and section are pre-filled automatically based on your teacher profile. The student dropdown automatically excludes students who have already completed an assessment for the chosen school year and period to avoid duplicate assessments.
              </div>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 2</div>
            <div className="um-step-title">Assessment 1, Task 1 — Recording</div>
            <div className="um-step-body">
              <p className="um-text">The reading text for Task 1 is shown on screen.</p>
              <ul className="um-list">
                <li>Click the Record button. A 3-second countdown overlay appears before recording starts.</li>
                <li>The student reads aloud. A red indicator shows the recording is live.</li>
                <li>You can Pause and Resume at any time during recording.</li>
                <li>When the student finishes, click Stop.</li>
                <li>A confirmation prompt asks if you want to keep the recording or retake it.</li>
                <li>Alternative: If you recorded the audio separately (on a phone or recorder), click Upload and select the audio file. Supported formats: MP3, WAV, M4A, OGG, WebM.</li>
              </ul>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 3</div>
            <div className="um-step-title">Review the Transcript — Task 1</div>
            <div className="um-step-body">
              <p className="um-text">The system processes the audio using speech-to-text. The transcribed text appears in an editable text box.</p>
              <ul className="um-list">
                <li>Important: Carefully review the transcript word by word. The speech recognition is not perfect, especially for Filipino words.</li>
                <li>Correct any mis-transcriptions by clicking on the text and typing your edits directly.</li>
                <li>When the transcript matches what the student actually said, click Confirm.</li>
              </ul>
              <div className="um-callout um-callout--warning">
                <strong>Warning:</strong> Always double-check the transcript. Errors in the transcript will affect the student's score. Take a moment to listen and verify.
              </div>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 4</div>
            <div className="um-step-title">Task 1 Results & Routing</div>
            <div className="um-step-body">
              <p className="um-text">The system scores Task 1 and automatically determines the route for Task 2:</p>
              <div className="um-table-wrapper">
                <table className="um-table">
                  <thead>
                    <tr>
                      <th>Language</th>
                      <th>Task 1 Score</th>
                      <th>Route</th>
                      <th>Task 2 Content</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Filipino</td>
                      <td>6 or fewer correct</td>
                      <td>Lower Route (Task 2L)</td>
                      <td>Grade 1: Rhyme Pairs (no recording); Grades 2-3: Simpler Word List (recorded)</td>
                    </tr>
                    <tr>
                      <td>Filipino</td>
                      <td>More than 6 correct</td>
                      <td>Higher Route (Task 2H)</td>
                      <td>Set of Sentences (recorded)</td>
                    </tr>
                    <tr>
                      <td>English</td>
                      <td>0 correct</td>
                      <td>Assessment Ends</td>
                      <td>Assessment ends; classified as Full Refresher</td>
                    </tr>
                    <tr>
                      <td>English</td>
                      <td>1 or more correct</td>
                      <td>Lower Route (Task 2L)</td>
                      <td>Word List (recorded)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="um-callout um-callout--note">
                <strong>Note:</strong> Grade 1 Filipino on the lower route: Task 2 is a rhyme identification task. You (the teacher) read each word pair aloud and mark Oo if they rhyme, or Hindi if they do not. No audio is recorded for this step.
              </div>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 5</div>
            <div className="um-step-title">Assessment 1, Task 2 — Recording</div>
            <div className="um-step-body">
              <p className="um-text">The recording, transcription review, and confirmation process is the same as Task 1. The only difference is the content shown — it will be either a word list or sentences, depending on the route.</p>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 6</div>
            <div className="um-step-title">Assessment 1 Results</div>
            <div className="um-step-body">
              <p className="um-text">The combined Task 1 + Task 2 scores determine the Assessment 1 Classification:</p>
              <ul className="um-list">
                <li>Full Refresher: The learner needs intensive reading intervention.</li>
                <li>Moderate Refresher: The learner needs significant reading support.</li>
                <li>Light Refresher: The learner is nearly ready for grade-level reading.</li>
                <li>Grade Ready: The learner is ready for grade-level reading.</li>
              </ul>
              <p className="um-text">The system then decides if the student continues to Assessment 2:</p>
              <ul className="um-list">
                <li>Proceeds to Assessment 2: Students on the higher route (sentences) who score above the threshold.</li>
                <li>Skips to Observation: Students on the lower route (words/rhymes) skip Assessment 2 entirely.</li>
              </ul>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 7</div>
            <div className="um-step-title">Choose a Story for Assessment 2</div>
            <div className="um-step-body">
              <p className="um-text">If the student qualifies, you will see a grid of story cards. Each card shows the story title and word count. Select a story for the student to read.</p>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 8</div>
            <div className="um-step-title">Assessment 2 — Story Reading</div>
            <div className="um-step-body">
              <p className="um-text">The student reads the full story aloud while you record. A grade-level time limit applies:</p>
              <ul className="um-list">
                <li>Grade 1: 1 minute (60 seconds)</li>
                <li>Grade 2: 2 minutes (120 seconds)</li>
                <li>Grade 3: 3 minutes (180 seconds)</li>
              </ul>
              <div className="um-callout um-callout--important">
                <strong>Important:</strong> The timer is not visible to the student. When the time limit is reached, the recording automatically pauses and a prompt asks whether to let the student continue or stop. If you continue, the recording resumes, but words read past the limit are tracked separately and will not inflate the student's fluency score.
              </div>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 9</div>
            <div className="um-step-title">Review the Transcript — Assessment 2</div>
            <div className="um-step-body">
              <p className="um-text">Verify the transcript against the story text. Words read within the time limit are highlighted in blue. Make any corrections and click Confirm.</p>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 10</div>
            <div className="um-step-title">Comprehension Questions</div>
            <div className="um-step-body">
              <p className="um-text">Ask the student each comprehension question shown on the screen (6 questions total). Mark each answer:</p>
              <ul className="um-list">
                <li>Correct: Student answered correctly.</li>
                <li>Wrong: Student gave an incorrect answer.</li>
                <li>N/A: The question was skipped or not asked.</li>
              </ul>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 11</div>
            <div className="um-step-title">Learner Experience Rating</div>
            <div className="um-step-body">
              <p className="um-text">This is an interactive step for the student. Hand the device to the student and have them tap the emoji face that best describes how they felt during the assessment:</p>
              <ul className="um-list">
                <li>Very Hard</li>
                <li>Struggled</li>
                <li>Okay</li>
                <li>Good</li>
                <li>Excellent</li>
              </ul>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 12</div>
            <div className="um-step-title">Observation & Remarks</div>
            <div className="um-step-body">
              <p className="um-text">Record your observation of how the student read:</p>
              <ul className="um-list">
                <li>Level 1: Reads word by word.</li>
                <li>Level 2: Reads in word chunks.</li>
                <li>Level 3: Reads fluently but does not observe punctuation marks.</li>
                <li>Level 4: Reads fluently with proper expression.</li>
              </ul>
              <p className="um-text">You may add optional remarks before clicking Save.</p>
            </div>
          </div>

          <div className="um-step-card">
            <div className="um-step-number">Step 13</div>
            <div className="um-step-title">Final Results</div>
            <div className="um-step-body">
              <p className="um-text">The final screen displays the complete assessment summary. Reading Profiles are determined by accuracy percentage and comprehension score:</p>
              <ul className="um-list">
                <li>Low Emerging Reader: Did not reach Assessment 2 (Part 1 score is 10 or below).</li>
                <li>High Emerging Reader: Reached Assessment 2 but read very little (accuracy below 25% or comprehension = 0).</li>
                <li>Developing Reader: Read 25%-50% of the passage correctly; comprehension score of 1-2.</li>
                <li>Transitioning Reader: Read 51%-75% of the passage correctly; comprehension score of 3-4.</li>
                <li>Reading at Grade Level: Read more than 75% of the passage correctly; comprehension score of 5-6.</li>
              </ul>
              <div className="um-callout um-callout--tip">
                <strong>Tip:</strong> If accuracy and comprehension fall into different levels, the system uses accuracy as a tiebreaker. From the results screen, you can print the report as a PDF, export to Excel, or start a new session.
              </div>
            </div>
          </div>
        </div>

        <div id="managing-students" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">3.4 Managing Students</h3>
          <div className="um-callout um-callout--important">
            <strong>Important:</strong> Before adding students, prepare the following information for each student: their LRN (Learner Reference Number — the 12-digit number from DepEd, found on the student's school records or SF10), full name (First Name and Last Name), sex (Male or Female), grade level, and section.
          </div>
          
          <p className="um-text"><strong>Option A — Adding a Single Student Manually</strong></p>
          <ol className="um-list">
            <li>Click Student Records in the left sidebar.</li>
            <li>Click the Add Student button.</li>
            <li>Fill in the form:
              <ul className="um-list">
                <li>LRN: Type the 12-digit Learner Reference Number. It must be exactly 12 numbers — no letters, no spaces.</li>
                <li>Sex: Select Male or Female.</li>
                <li>First Name: Type the student's first name.</li>
                <li>Last Name: Type the student's last name.</li>
                <li>Grade Level: Select from the dropdown (Grade 1, 2, or 3).</li>
                <li>Section: Type or select the section name.</li>
              </ul>
            </li>
            <li>Click Save. The student will now appear in your student list.</li>
          </ol>
          
          <p className="um-text"><strong>Option B — Importing Multiple Students from Excel</strong></p>
          <ol className="um-list">
            <li>Click Student Records in the left sidebar.</li>
            <li>Click the Import Students button.</li>
            <li>Prepare an Excel file (.xlsx) with these exact column headers: LRN, First Name, Last Name, Sex, Grade Level, Section.</li>
            <li>Upload the file by clicking Browse or by dragging the file into the upload area.</li>
            <li>The system will validate the data and show a preview. Fix any errors highlighted in red.</li>
            <li>Click Import to save all students at once.</li>
          </ol>
          
          <p className="um-text"><strong>Viewing a Student's Profile</strong></p>
          <ul className="um-list">
            <li>Click on any student card in Student Records to see their detailed statistics (total assessments, average accuracy, WPM, latest observation level) and full session history.</li>
          </ul>
        </div>

        <div id="managing-passages" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">3.5 Managing Passages</h3>
          <p className="um-text">Click Passages in the sidebar. Passages are organized into Assessment 1 and Assessment 2 (Stories).</p>
          <ul className="um-list">
            <li>Public Library: Public passages provided by your school admin. These are read-only — you cannot edit them.</li>
            <li>Adding Passages Manually: Fill in the text fields (Task 1 content, Task 2 words, Task 2 sentences, or Story details with comprehension questions) and click Save.</li>
            <li>Document Import: Drag and drop a .docx or .txt file into the upload modal.</li>
            <li>Download Template: Inside the upload modal, click Download Template. The system will automatically generate and download a pre-formatted template based on your assigned grade level and language. This guarantees the correct formatting for error-free document parsing.</li>
            <li>Bulk Upload: You can select and upload multiple document files at once. The system parses them all and saves them to your library.</li>
          </ul>
        </div>

        <div id="class-record" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">3.6 Class Record</h3>
          <p className="um-text">The Class Record provides a spreadsheet-style view of your class's assessment results.</p>
          <ol className="um-list">
            <li>Go to Student Records in the sidebar.</li>
            <li>Click the Class Record button.</li>
            <li>Filter by School Year, Assessment Period, and Language.</li>
            <li>You can print or export this table to Excel for DepEd reporting.</li>
          </ol>
        </div>

        <div id="your-profile" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
          <h3 className="um-subsection-title">3.7 Your Profile</h3>
          <p className="um-text">Click My Profile in the sidebar.</p>
          <ul className="um-list">
            <li>Editable Fields: First Name, Last Name, Profile Picture (JPEG, PNG, or WebP).</li>
            <li>Locked Fields:
              <ul className="um-list">
                <li>Employee ID: This field is locked permanently after your initial save. Maximum of 7 characters. Double-check before saving!</li>
                <li>School details, Grade, and Section: These are assigned by your school administrator and cannot be modified by teachers.</li>
              </ul>
            </li>
          </ul>
          <div className="um-callout um-callout--warning">
            <strong>Warning:</strong> Once you save your Employee ID, it cannot be changed. If you made a mistake, contact system support.
          </div>
        </div>
      </div>

      {isAdmin && (
        <div id="admin-guide" className="um-section" style={{ scrollMarginTop: '80px' }}>
          <h2 className="um-section-title">4. Admin Guide</h2>
          
          <div id="admin-dashboard" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
            <h3 className="um-subsection-title">4.1 Admin Dashboard</h3>
            <p className="um-text">The Admin Dashboard displays school-wide performance statistics:</p>
            <ul className="um-list">
              <li>Total Teachers: Count of registered teachers at your school.</li>
              <li>Students Assessed: Unique students with at least one completed session.</li>
              <li>Total Sessions: All assessment sessions created across the school.</li>
              <li>Completion Rate: Percentage of sessions that were completed.</li>
              <li>School Code: The unique alphanumeric code displayed on your dashboard. Teachers must use this code when registering. You can copy it and share it with your teachers.</li>
            </ul>
          </div>

          <div id="managing-teachers" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
            <h3 className="um-subsection-title">4.2 Managing Teachers</h3>
            <p className="um-text">Click Teachers in the sidebar.</p>
            
            <p className="um-text"><strong>Assigning a Class to a Teacher</strong></p>
            <ol className="um-list">
              <li>Find the teacher in the list.</li>
              <li>Click the Assign button on their row.</li>
              <li>Select the School Year and Grade Level from the dropdowns.</li>
              <li>Type the Section name.</li>
              <li>Click Assign to confirm. The teacher can now see students and passages matching that grade and section.</li>
            </ol>
            
            <p className="um-text"><strong>Editing a Teacher's Assignment</strong></p>
            <ol className="um-list">
              <li>Click the Edit button on the teacher's row.</li>
              <li>Modify the grade level or section as needed.</li>
              <li>Note: The teacher's Employee ID is read-only and cannot be changed.</li>
            </ol>
            
            <p className="um-text"><strong>Archiving a Teacher</strong></p>
            <ol className="um-list">
              <li>Click the Archive button on the teacher's row.</li>
              <li>Confirm the action. The teacher's account will be deactivated — they can no longer log in.</li>
              <li>Their class data is preserved but the row appears disabled.</li>
              <li>To reactivate an archived teacher, contact system support.</li>
            </ol>
            
            <p className="um-text"><strong>Viewing Activity Logs</strong></p>
            <ol className="um-list">
              <li>Click the Logs button on any teacher's row.</li>
              <li>A detailed drawer opens showing all actions with timestamps: logins, student additions, session starts, session completions, and more.</li>
            </ol>
          </div>

          <div id="admin-student-records" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
            <h3 className="um-subsection-title">4.3 Viewing Student Records</h3>
            <p className="um-text">Click Student Records in the sidebar to see school-wide classes grouped by school year.</p>
            <ul className="um-list">
              <li>Records are read-only for admins.</li>
              <li>You can reassign class ownership to another teacher if needed.</li>
            </ul>
          </div>

          <div id="public-passages" className="um-subsection" style={{ scrollMarginTop: '80px' }}>
            <h3 className="um-subsection-title">4.4 Managing Public Passages</h3>
            <p className="um-text">Admins can add, edit, or archive public passages.</p>
            <ul className="um-list">
              <li>Public passages are distributed to all teachers whose assigned grade and language match the passage.</li>
              <li>Teachers can use these passages in assessments but cannot edit them.</li>
              <li>To add a public passage, click the Add button and fill in the content fields.</li>
            </ul>
          </div>
        </div>
      )}

      <div id="faq" className="um-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="um-section-title">5. Frequently Asked Questions</h2>
        
        <div className="um-faq-item">
          <p className="um-faq-q">Q: Why is the school name read-only during registration?</p>
          <p className="um-faq-a">A: As a teacher, once you enter a valid School Code or DepEd School ID, the system looks up the school in the database and automatically fills in the school name. This ensures all teachers are correctly grouped under the same school.</p>
        </div>
        
        <div className="um-faq-item">
          <p className="um-faq-q">Q: Can I edit my Employee ID if I typed it wrong?</p>
          <p className="um-faq-a">A: No. Once you save your Employee ID on the profile page, it is permanently locked to secure teacher identities. If you made a mistake, please contact system support to reset it.</p>
        </div>
        
        <div className="um-faq-item">
          <p className="um-faq-q">Q: What happens if the student reads past the time limit in Assessment 2?</p>
          <p className="um-faq-a">A: The system automatically pauses when the time limit (60s, 120s, or 180s) is reached. If you click continue, the recording resumes, but the words read past the limit are tracked separately and do not inflate the student's Correct Words Per Minute (CWPM) score.</p>
        </div>
        
        <div className="um-faq-item">
          <p className="um-faq-q">Q: Why do English students skip Assessment 2?</p>
          <p className="um-faq-a">A: Following the CRLA guidelines, English assessments do not have a sentences route (Task 2H) or connected story reading (Assessment 2). English students complete Task 2 Words and then proceed straight to Observation and results.</p>
        </div>
        
        <div className="um-faq-item">
          <p className="um-faq-q">Q: How do I upload rhyming word pairs for Grade 1 Filipino?</p>
          <p className="um-faq-a">A: Click the Download Template button in the upload modal. The template shows the correct structure: word1, word2|Oo or word1, word2|Hindi on separate lines under the Task 2 section.</p>
        </div>
      </div>
    </>
  );

  return (
    <Layout>
      <div className="pp-page" style={{ paddingBottom: 0 }}>
        {/* Top Bar */}
        <div className="um-topbar">
          <button className="um-back-btn" onClick={() => navigate('/profile')} aria-label="Go back">
            <ChevronLeft size={18} color="#1a2340" />
          </button>
          <h1 className="um-topbar-title">User Manual</h1>
          <div className="um-topbar-actions">
            <button className="um-download-btn" onClick={handleDownloadManual}>
              <Download size={14} /> <span>Download PDF</span>
            </button>
            <button className="um-mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div className="um-layout">
          {/* Sidebar Overlay for mobile */}
          {sidebarOpen && <div className="um-sidebar-overlay um-sidebar-overlay--visible" onClick={() => setSidebarOpen(false)} />}
          
          {/* Sidebar */}
          <aside className={`um-sidebar ${sidebarOpen ? 'um-sidebar--open' : ''}`}>
            <div className="um-sidebar-header">
              <h2 className="um-sidebar-title">Table of Contents</h2>
              <div className="um-search-wrapper">
                <Search size={14} className="um-search-icon" />
                <input
                  type="text"
                  className="um-search-input"
                  placeholder="Search manual..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <nav className="um-toc-nav">
              <ul className="um-toc-list">
                {filteredSections.map(section => (
                  <li key={section.id} className="um-toc-section">
                    <button
                      className={`um-toc-item ${activeSection === section.id ? 'um-toc-item--active' : ''}`}
                      onClick={() => scrollToSection(section.id)}
                    >
                      {section.title}
                      {section.adminOnly && <span className="um-admin-badge">Admin</span>}
                    </button>
                    {section.subsections.length > 0 && (
                      <ul className="um-toc-sub-list">
                        {section.subsections
                          .filter(sub => !searchQuery || sub.title.toLowerCase().includes(searchQuery.toLowerCase()) || section.title.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(sub => (
                            <li key={sub.id}>
                              <button
                                className={`um-toc-sub-item ${activeSection === sub.id ? 'um-toc-sub-item--active' : ''}`}
                                onClick={() => scrollToSection(sub.id)}
                              >
                                {sub.title}
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                ))}
                {filteredSections.length === 0 && (
                  <li className="um-no-results">No matching sections found.</li>
                )}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <div className="um-content-wrapper" ref={contentRef}>
            <div className="um-content">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Scroll to top */}
        <button
          className={`um-scroll-top ${showScrollTop ? 'um-scroll-top--visible' : ''}`}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ChevronUp size={22} />
        </button>
      </div>
    </Layout>
  );
}
