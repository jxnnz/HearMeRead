import React from "react";
import { ChevronLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import Layout from "../components/Layout";
import "./pages css/ProfilePage.css"; // Reuse manual styling from ProfilePage.css

export default function UserManualPage() {
  const navigate = useNavigate();

  function handleDownloadManual() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    const pageHeight = 297;
    const pageWidth = 210;
    const maxW = pageWidth - (margin * 2); // 170
    let y = margin;

    function checkPageBreak(neededHeight) {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin + 10;
        // Page header
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.text("HearMeRead — User Manual", margin, margin - 5);
        doc.setDrawColor(230, 235, 245);
        doc.line(margin, margin - 3, pageWidth - margin, margin - 3);
      }
    }

    const manualText = `# HearMeRead — User Manual
A Speech Processing Framework for Automated Oral Reading
Version 1.0 · May 2026

Supported Grades: Grade 1, Grade 2, and Grade 3 — Filipino and English
Framework: DepEd Classroom Reading Level Assessment (CRLA)

=========================================
1. INTRODUCTION
=========================================
HearMeRead is an automated oral reading assessment tool for elementary school teachers in Grades 1 to 3. It helps you conduct, record, score, and track reading assessments following the DepEd CRLA framework.

With HearMeRead, you can:
- Record a student reading aloud and automatically transcribe the audio.
- Score the reading against the passage text to identify miscues — substitutions, insertions, and deletions.
- Classify the student's reading level (Full Refresher, Moderate Refresher, Light Refresher, Grade Ready).
- Track student reading profiles across the school year (BoSY, MoSY, EoSY).
- Export results to Excel or PDF for DepEd reporting.

Role Responsibilities:
- Teacher: Conducts assessments, manages students and class passages, views class records, and exports results.
- Admin: Oversees all teachers and classes, manages teacher class assignments, and manages the school-wide public passage library.

=========================================
2. GETTING STARTED
=========================================
2.1 Account Creation
1. Go to the HearMeRead homepage and click Register.
2. Select your role using the toggle: "Teacher" or "Admin".
3. If registering as a Teacher: Enter your First and Last Name, Email, Password, and your school's DepEd School ID (6-digit number) or School Code (8-character alphanumeric). The system looks up your school automatically and retrieves the School Name.
4. If registering as an Admin: Enter your First and Last Name, Email, Password, School Name, and DepEd School ID. A unique School Code will be generated for your school upon successful signup.
5. Check the boxes for the Terms & Conditions and Data Privacy Agreement, then click Register.

* Password Security Rules: Must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. !@#$).

2.2 Email Verification
Open your email inbox and look for a verification message from HearMeRead. Click the link to activate your account. The link expires after 24 hours. If it has expired, click "Resend verification email" on the login page.

2.3 Sessions & Active Time
- Session Lifetime: A login session is active for a maximum of 4 hours.
- Inactivity Logout: If the system detects 30 minutes of inactivity, it will automatically log you out to secure student data.

=========================================
3. TEACHER GUIDE
=========================================
3.1 Dashboard & Navigation
- Dashboard Summary: View your class's average reading accuracy, number of students assessed, gender-based reading profile distribution, and fluency tracking charts.
- Sidebar Menu: Navigate between Dashboard, Assessment, Passages, Student Records, My Profile, and Logout.

3.2 Running an Assessment
Assessments are conducted one-on-one with the student. The full process takes about 3 to 5 minutes.

Step 1: Session Setup
Select the current School Year, Assessment Period (BoSY, MoSY, EoSY), Student, Language (Filipino or English), and an Assessment 1 passage.
* Note: Grade and section are pre-filled from your profile. The student list will automatically hide students who have already been assessed for that period.

Step 2: Assessment 1 — Task 1
Click Record (starts after a 3-second countdown) or click Upload to submit a pre-recorded audio file. Have the student read the letters/words. Click Stop when done and choose Keep or Retake.

Step 3: Transcript Review (Task 1)
Wait for transcription to finish. Review the transcribed text in the editable box, correct any speech-to-text errors, and click Confirm.

Step 4: Routing to Task 2
The system scores Task 1 and automatically determines the route:
- Filipino (<= 6 score): Routes to Task 2L (Lower Route).
  * Grade 1: Rhyming word pairs (no recording; teacher marks student responses manually).
  * Grades 2-3: Simpler word list (recorded).
- Filipino (> 6 score): Routes to Task 2H (Higher Route) — recorded set of sentences.
- English (= 0 score): Assessment ends immediately with a Full Refresher classification.
- English (>= 1 score): Routes to Task 2 (Lower Route) — recorded word list.

Step 5: Assessment 1 — Task 2
Record, review, and confirm Task 2 content following the same process as Task 1.

Step 6: Assessment 1 Results
View the combined Task 1 + Task 2 score and classification:
- Full Refresher (Needs intensive intervention)
- Moderate Refresher (Needs significant support)
- Light Refresher (Nearly ready for grade level)
- Grade Ready (Reading at grade level)

If the student is on the Higher Route (sentences) and scores above the threshold, they proceed to Assessment 2. Lower route (words/rhymes) students skip straight to Observation.

Step 7: Story Selection (Assessment 2)
Select a story card for the student to read.

Step 8: Assessment 2 — Story Reading
Record the student reading the story. Time limits apply depending on the grade level:
- Grade 1: 60 seconds (1 minute)
- Grade 2: 120 seconds (2 minutes)
- Grade 3: 180 seconds (3 minutes)

* Note: If the limit is reached, the recording automatically pauses. You can choose to stop there or let the student continue reading. Any words read past the limit will not count towards their fluency score.

Step 9: Transcript Review (Assessment 2)
Review and correct the story transcript. Words read before the time limit are highlighted in blue.

Step 10: Comprehension Questions
Ask the student the 6 comprehension questions appearing on the screen. Mark each response as Correct, Wrong, or N/A (skipped).

Step 11: Learner Experience
Present the screen to the student and let them tap the emoji face matching how they felt during the assessment (Very Hard, Struggled, Okay, Good, or Excellent).

Step 12: Observation & Remarks
Record the student's reading observation level:
- Level 1: Reads word by word.
- Level 2: Reads word in chunks.
- Level 3: Reads fluently but not observing punctuation marks.
- Level 4: Reads fluently with proper expression.

Add optional remarks and click Save.

Step 13: Final Results & Profiles
View the final results summary. Reading Profiles are determined by accuracy and comprehension:
- Low Emerging Reader: Part 1 total score is 10 or below.
- High Emerging Reader: Reached Assessment 2 but read very little (accuracy < 25% or comprehension = 0).
- Developing Reader: Read 25%–50% of the passage correctly; comprehension score of 1–2.
- Transitioning Reader: Read 51%–75% of the passage correctly; comprehension score of 3–4.
- Reading at Grade Level: Read > 75% of the passage correctly; comprehension score of 5–6.
* Note: If accuracy and comprehension fall into different levels, accuracy acts as a tiebreaker. You can export results to Excel, print a PDF, or start a new session.

3.3 Student Records
- Add Student: Enter LRN (exactly 12 digits), Sex, First Name, Last Name, Grade Level, and Section.
- Import Students: Upload an Excel file with required columns (LRN, First Name, Last Name, Sex, Grade Level, Section).
- Student profile: View individual statistics (average accuracy, WPM, sessions) and history.

3.4 Passage Library
- Add passages manually or drag and drop a .docx or .txt file in the upload modal.
- Templates: Click Download Template in the upload modal to get the required formatting template for your grade.
- Bulk Upload: Select multiple files to parse and save them in bulk.

3.5 Class Record
Go to Student Records and click Class Record to view, print, or export a DepEd-style class record spreadsheet.

3.6 Profile & Locking
Update your first name, last name, and profile picture.
- Employee ID: LOCKED after your initial save. It has a maximum length of 7 characters.
- Class Assignment: Grade, section, and school details are managed by your school admin.

=========================================
4. ADMIN GUIDE
=========================================
The dashboard displays total registered teachers, students assessed, sessions completed, completion rates, and your school's unique School Code (needed by teachers during registration).

4.2 Managing Teachers & Classes
- Assign Class: Find a teacher, click Assign, enter the School Year, Grade Level, and Section.
- Edit Assignment: Modify the class details for active teachers. (Employee ID is read-only).
- Archive Teacher: Deactivates accounts. Archived teachers cannot log in.
- Activity Logs: Click Logs on a teacher's row to view a detailed history of their actions.

4.3 Student Records & Public Passages
- View class records across school years.
- Manage the school's Public Library of reading passages (which teachers can use but not edit).

=========================================
5. FREQUENTLY ASKED QUESTIONS (FAQ)
=========================================
Q: Why is the school name pre-filled and uneditable when registering?
A: Teachers must register using a School Code or School ID. The app automatically fetches the school name to ensure all teachers are mapped to the correct school.

Q: Can I correct my Employee ID if I made a typo?
A: No. Once saved, your Employee ID is locked to prevent identity tampering. Please contact system support to modify a locked ID.

Q: How are slow readers scored if they exceed the time limit?
A: The system automatically pauses at the time limit. If you choose to let the student continue reading, the extra time is excluded from the CWPM (Correct Words Per Minute) calculation to prevent score inflation.

Q: Why do English students skip Assessment 2?
A: Under the CRLA framework, English assessments do not have a sentences route or a connected story reading task. English students finish after Task 2 Words.

Q: How do I upload rhyming word pairs for Grade 1 Filipino?
A: Use the Download Template button in the upload modal. Rhyme pairs must follow the format word1, word2|Oo or word1, word2|Hindi on separate lines.
`;

    const lines = manualText.split("\n");

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        // Empty line -> add spacing
        y += 2.5;
        return;
      }

      // Skip divider lines
      if (line.startsWith("===") || line.startsWith("---")) {
        return;
      }

      if (line.startsWith("# ")) {
        // Document Title
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
        // H1 Title like "1. INTRODUCTION"
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(44, 62, 107);
        
        const wrapped = doc.splitTextToSize(line, maxW);
        checkPageBreak(wrapped.length * 6 + 4);
        y += 2; // extra spacing before H1
        wrapped.forEach((l) => {
          doc.text(l, margin, y);
          y += 6;
        });
        y += 2;
      } else if (line.match(/^[1-5]\.[0-9]/)) {
        // Subsection title like "2.1 Account Creation"
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(44, 62, 107);
        
        const wrapped = doc.splitTextToSize(line, maxW);
        checkPageBreak(wrapped.length * 5 + 3);
        y += 1.5; // spacing before H2
        wrapped.forEach((l) => {
          doc.text(l, margin, y);
          y += 5;
        });
        y += 1.5;
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        // Bullet list item
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
        // Numbered list item
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(60, 65, 80);
        
        const dotIdx = line.indexOf(".");
        const numPrefix = line.substring(0, dotIdx + 2); // e.g. "1. "
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
        // Normal text
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

    // Add page numbers at the bottom of all pages
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

  return (
    <Layout>
      <div className="pp-page" style={{ paddingBottom: "40px" }}>
        <div className="pp-manual-topbar">
          <button
            className="pp-manual-back-btn"
            onClick={() => navigate("/profile")}
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="pp-manual-topbar-title">User Manual</h1>
        </div>

        <div className="pp-content" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <div className="pp-manual-card" style={{ maxWidth: "780px", margin: "0 auto", marginTop: 0 }}>
            <div className="pp-manual-header">
              <h2 className="pp-manual-title">User Manual</h2>
              <button
                type="button"
                className="pp-manual-download-btn"
                onClick={handleDownloadManual}
              >
                <Download size={14} /> Download Manual
              </button>
            </div>

            <div className="pp-manual-section">
              <h3>1. Introduction</h3>
              <p>
                HearMeRead is an oral reading assessment tool for elementary school teachers in Grades 1 to 3. It helps you conduct, record, score, and track reading assessments following the DepEd Classroom Reading Level Assessment (CRLA) framework.
              </p>
              <p><strong>With HearMeRead, you can:</strong></p>
              <ul>
                <li>Record a student reading aloud and automatically transcribe the audio.</li>
                <li>Score the reading against the passage text to identify miscues (substitutions, insertions, and deletions).</li>
                <li>Classify the student's reading level (Full Refresher, Moderate Refresher, Light Refresher, Grade Ready).</li>
                <li>Track student reading profiles across the school year (BoSY, MoSY, EoSY).</li>
                <li>Export results to Excel or PDF for DepEd reporting.</li>
              </ul>
              <p><strong>Role Responsibilities:</strong></p>
              <ul>
                <li><strong>Teacher:</strong> Conducts assessments, manages students and class passages, views class records, and exports results.</li>
                <li><strong>Admin:</strong> Oversees all teachers and classes, manages teacher class assignments, and manages the school-wide public passage library.</li>
              </ul>
            </div>

            <div className="pp-manual-section">
              <h3>2. Getting Started</h3>
              <h4>2.1 Account Creation</h4>
              <p>
                Go to the website, click <strong>Register</strong>, and toggle your role between <strong>Teacher</strong> and <strong>Admin</strong>.
              </p>
              <ul>
                <li><strong>Teachers:</strong> Must input their school's 6-digit DepEd School ID or 8-character School Code. The system will look up your school automatically and display the School Name.</li>
                <li><strong>Admins:</strong> Enter School Name and 6-digit DepEd School ID manually. A unique School Code will be generated for your school upon successful registration.</li>
              </ul>
              <div className="pp-manual-note">
                <strong>Password Security:</strong> Passwords must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., <code>!@#$</code>).
              </div>

              <h4>2.2 Email Verification</h4>
              <p>
                Check your inbox and click the verification link sent by HearMeRead. The link expires after <strong>24 hours</strong>. If it expires, click "Resend verification email" on the login page.
              </p>

              <h4>2.3 Session Expiration</h4>
              <ul>
                <li>Your login session remains active for up to <strong>4 hours</strong>.</li>
                <li>An inactivity timer automatically logs you out after <strong>30 minutes</strong> of no interaction to protect student records.</li>
              </ul>
            </div>

            <div className="pp-manual-section">
              <h3>3. Teacher Guide</h3>
              <h4>3.1 Running an Assessment</h4>
              <p>
                Click <strong>New Session</strong>. Setup your assessment by choosing the School Year, Assessment Period (BoSY, MoSY, EoSY), Student, Language, and Passage.
              </p>
              <div className="pp-manual-note">
                Grade and section are auto-filled. Already assessed students are automatically hidden from the dropdown selection.
              </div>

              <h4>3.2 Assessment Steps & Routing</h4>
              <ol>
                <li><strong>Task 1:</strong> Record the student reading or upload an audio file. Review the transcription, edit any mistakes, and click Confirm.</li>
                <li><strong>Routing Rules:</strong> The system automatically routes the student:
                  <ul>
                    <li><strong>Filipino (&le; 6 score):</strong> Simpler route (Gawain 2L). Grade 1 students are guided through rhyming word pairs where teachers manually input correctness (no audio recording). Grades 2–3 read a simpler word list (recorded).</li>
                    <li><strong>Filipino (&gt; 6 score):</strong> Higher route (Gawain 2H) — student reads a set of sentences (recorded).</li>
                    <li><strong>English (= 0 score):</strong> Assessment ends immediately (Full Refresher).</li>
                    <li><strong>English (&ge; 1 score):</strong> Student reads a simpler word list (no sentences route exists for English).</li>
                  </ul>
                </li>
                <li><strong>Assessment 2 (Story Reading):</strong> Qualifiers on the higher route read a story aloud. Timed limits apply: Grade 1 (60s), Grade 2 (120s), Grade 3 (180s). The recording pauses at the limit. You can allow them to continue, but extra words read past the limit do not affect their fluency score.</li>
                <li><strong>Comprehension Questions:</strong> Ask the student 6 questions and log them as Correct, Wrong, or N/A.</li>
                <li><strong>Learner Experience:</strong> Let the student tap the emoji face matching their experience (Very Hard, Struggled, Okay, Good, Excellent).</li>
                <li><strong>Observation Level:</strong> Select the reading fluency level (Level 1: Reads word by word; Level 2: Reads in chunks; Level 3: Reads fluently but ignores punctuation; Level 4: Reads with expression). Add remarks and save.</li>
              </ol>

              <h4>3.3 Reading Profiles (Final Results)</h4>
              <ul>
                <li><strong>Low Emerging Reader:</strong> Part 1 total score is 10 or below (overrides story reading).</li>
                <li><strong>High Emerging Reader:</strong> Reached story reading but read very little (accuracy &lt; 25% or comprehension = 0).</li>
                <li><strong>Developing Reader:</strong> Read 25%–50% of the story correctly; 1–2 comprehension answers correct.</li>
                <li><strong>Transitioning Reader:</strong> Read 51%–75% of the story correctly; 3–4 comprehension answers correct.</li>
                <li><strong>Reading at Grade Level:</strong> Read &gt; 75% of the story correctly; 5–6 comprehension answers correct.</li>
              </ul>
              <div className="pp-manual-note">
                If accuracy and comprehension fall into different levels, the system uses <strong>accuracy</strong> as a tiebreaker.
              </div>

              <h4>3.4 Passage & Student Management</h4>
              <ul>
                <li><strong>Student LRN:</strong> LRNs must be exactly 12 digits. You can import class rosters via Excel.</li>
                <li><strong>Passages & Templates:</strong> Upload `.docx` or `.txt` files. Click <strong>Download Template</strong> inside the upload modal to get the correct structure for your grade level. You can also import multiple passages in bulk.</li>
                <li><strong>Profile Lock:</strong> Your <strong>Employee ID</strong> (max 7 characters) is permanently locked after your initial save.</li>
              </ul>
            </div>

            <div className="pp-manual-section">
              <h3>4. Admin Guide</h3>
              <ul>
                <li><strong>Class Assignments:</strong> Admins assign teachers to classes (School Year, Grade Level, Section).</li>
                <li><strong>Teacher Archiving:</strong> Admins can archive inactive teachers. Archiving deactivates the account and blocks logins.</li>
                <li><strong>Activity Logs:</strong> Click <strong>Logs</strong> next to any teacher to view their detailed activity history (logins, session starts, student additions).</li>
                <li><strong>Public Passages:</strong> Manage passages in the Public Library distributed to all matching grade teachers.</li>
              </ul>
            </div>

            <div className="pp-manual-section">
              <h3>5. Frequently Asked Questions (FAQ)</h3>
              <div className="pp-manual-faq-item">
                <p className="pp-manual-faq-q">Q: Why is the school name pre-filled and uneditable when registering?</p>
                <p className="pp-manual-faq-a">A: Teachers register using a School Code/ID. The app automatically fetches the school name to group teachers under the correct school entity.</p>
              </div>
              <div className="pp-manual-faq-item">
                <p className="pp-manual-faq-q">Q: Can I edit my Employee ID if I made a typo?</p>
                <p className="pp-manual-faq-a">A: No. Your Employee ID is locked once saved to secure teacher profiles. Contact support if you need to modify it.</p>
              </div>
              <div className="pp-manual-faq-item">
                <p className="pp-manual-faq-q">Q: How are slow readers scored if they exceed the time limit?</p>
                <p className="pp-manual-faq-a">A: The system automatically pauses at the time limit. If you choose to let them continue, the extra words are excluded from the CWPM (Correct Words Per Minute) calculation to prevent score inflation.</p>
              </div>
              <div className="pp-manual-faq-item">
                <p className="pp-manual-faq-q">Q: Why do English students skip Assessment 2?</p>
                <p className="pp-manual-faq-a">A: Under the CRLA framework, English assessments do not have a sentences route or a connected story reading task. English students finish after Task 2 Words.</p>
              </div>
              <div className="pp-manual-faq-item">
                <p className="pp-manual-faq-q">Q: How do I upload rhyming word pairs for Grade 1 Filipino?</p>
                <p className="pp-manual-faq-a">A: Use the Download Template button in the upload modal. Rhyme pairs must follow the format <code>word1, word2|Oo</code> or <code>word1, word2|Hindi</code> on separate lines.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
