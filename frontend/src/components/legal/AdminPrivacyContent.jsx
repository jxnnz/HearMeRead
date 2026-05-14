export default function AdminPrivacyContent() {
  return (
    <>
      <p className="legal-updated">Last updated: May 13, 2026 · In accordance with RA 10173 (Data Privacy Act of 2012)</p>

      <h3>1. Administrator as Co-Data Controller</h3>
      <p>
        By registering as a school Administrator on HearMeRead, you acknowledge and accept the role of
        <strong> co-Data Controller</strong> under Republic Act No. 10173 (Data Privacy Act of 2012) for all
        personal data processed within your school's account. This means you share responsibility with
        HearMeRead for how data is collected, used, and protected within your school.
      </p>

      <h3>2. Types of Data Collected</h3>
      <ul>
        <li><strong>Administrator information:</strong> Full name, email address, school name and code.</li>
        <li><strong>Teacher information:</strong> Full name, email address, verification status, date joined.</li>
        <li><strong>Student information:</strong> First name, last name, LRN, grade level, section, sex, school year.</li>
        <li><strong>Assessment data:</strong> Reading scores, CWPM results, comprehension scores, audio recordings (temporary).</li>
      </ul>

      <h3>3. Purpose of Data Collection</h3>
      <ul>
        <li>To facilitate oral reading assessment aligned with DepEd guidelines.</li>
        <li>To generate reading performance reports for individual students and school-level summaries.</li>
        <li>To support school administrators in monitoring literacy outcomes across classrooms.</li>
        <li>To enable school-level management of teacher accounts.</li>
      </ul>

      <h3>4. Legal Basis (RA 10173, Section 12)</h3>
      <p>Data is processed on the following legal bases:</p>
      <ul>
        <li>Consent of the data subject or their authorized representative (e.g., parent/guardian for minors).</li>
        <li>Compliance with a legal obligation (DepEd assessment requirements).</li>
        <li>Legitimate interests of the school in monitoring and improving student literacy outcomes.</li>
      </ul>

      <h3>5. Administrator Obligations Under RA 10173</h3>
      <ul>
        <li>Ensure only authorized teachers are given access to your school's HearMeRead account via the school code.</li>
        <li>Ensure teachers under your school obtain appropriate parental/guardian consent before entering student data.</li>
        <li>Report any actual or suspected personal data breach to HearMeRead within 72 hours of discovery.</li>
        <li>Cooperate with any investigation by the National Privacy Commission (NPC).</li>
        <li>Implement reasonable organizational measures to ensure data is used only for its stated purposes.</li>
      </ul>

      <h3>6. Data Retention Policy</h3>
      <ul>
        <li>Student records are retained for the duration of the teacher's active account.</li>
        <li>Audio recordings are automatically deleted after 7 days.</li>
        <li>Upon account deletion, all associated school, teacher, and student data will be permanently removed within 30 days.</li>
      </ul>

      <h3>7. Data Subject Rights</h3>
      <p>Under RA 10173, data subjects (teachers, students, and guardians) have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of personal data held by HearMeRead.</li>
        <li><strong>Correction:</strong> Request corrections to inaccurate personal data.</li>
        <li><strong>Erasure:</strong> Request deletion of personal data under certain conditions.</li>
        <li><strong>Portability:</strong> Request a portable copy of their data.</li>
        <li><strong>Object:</strong> Object to the processing of personal data in certain circumstances.</li>
      </ul>
      <p>
        As an Administrator, you must facilitate the exercise of these rights within your school and
        escalate requests to HearMeRead when necessary.
      </p>

      <h3>8. Data Security Measures</h3>
      <ul>
        <li>Student names and LRN are stored using Fernet symmetric encryption.</li>
        <li>Passwords are stored as bcrypt hashes and are never stored in plaintext.</li>
        <li>All data is transmitted over HTTPS.</li>
        <li>Access tokens expire after 60 minutes.</li>
        <li>School codes provide an additional layer of access control for teacher registration.</li>
      </ul>

      <h3>9. Data Breach Response</h3>
      <ul>
        <li>HearMeRead will notify registered Administrators of any confirmed data breach affecting their school within 72 hours of discovery.</li>
        <li>Administrators are responsible for notifying affected data subjects (teachers, parents/guardians) within their school as required by RA 10173.</li>
        <li>Breaches must be reported to the NPC as required by law.</li>
      </ul>

      <h3>10. Third-Party Services</h3>
      <ul>
        <li><strong>Resend:</strong> Used for transactional email delivery.</li>
        <li><strong>Railway:</strong> Cloud hosting provider for backend infrastructure.</li>
      </ul>
      <p>These providers are bound by their own data processing agreements and comply with applicable privacy laws.</p>

      <h3>11. Contact / Data Protection Officer</h3>
      <p>
        For privacy-related concerns, requests, or complaints, please contact:
        <br />
        <strong>hearmeread.dpo@gmail.com</strong>
      </p>
      <p>
        You also have the right to lodge a complaint with the National Privacy Commission (NPC)
        at <strong>www.privacy.gov.ph</strong>.
      </p>
    </>
  );
}
