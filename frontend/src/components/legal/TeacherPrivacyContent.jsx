export default function TeacherPrivacyContent() {
  return (
    <>
      <p className="legal-updated">Last updated: May 13, 2026 · In accordance with RA 10173 (Data Privacy Act of 2012)</p>

      <h3>1. Data Controller Information</h3>
      <p>
        HearMeRead acts as the Data Controller for personal information collected through this platform.
        By registering, you acknowledge that your data will be processed as described in this agreement.
      </p>

      <h3>2. Types of Data Collected</h3>
      <ul>
        <li><strong>Teacher information:</strong> Full name, email address, school affiliation.</li>
        <li><strong>Student information:</strong> First name, last name, Learner Reference Number (LRN), grade level, section, sex, school year.</li>
        <li><strong>Assessment data:</strong> Reading scores, CWPM results, comprehension scores, audio recordings (temporary).</li>
      </ul>

      <h3>3. Purpose of Data Collection</h3>
      <ul>
        <li>To facilitate oral reading assessment aligned with DepEd guidelines.</li>
        <li>To generate reading performance reports for individual students.</li>
        <li>To support teachers in monitoring and improving student literacy outcomes.</li>
      </ul>

      <h3>4. Legal Basis (RA 10173, Section 12)</h3>
      <p>
        Data is processed on the following legal bases under the Data Privacy Act of 2012:
      </p>
      <ul>
        <li>Consent of the data subject or their authorized representative.</li>
        <li>Compliance with a legal obligation to which the personal information controller is subject.</li>
        <li>Legitimate interests pursued by the controller or a third party.</li>
      </ul>

      <h3>5. Data Retention Policy</h3>
      <ul>
        <li>Student records are retained for the duration of the teacher's active account.</li>
        <li>Audio recordings are automatically deleted after 7 days.</li>
        <li>Upon account deletion, all associated student data will be permanently removed within 30 days.</li>
      </ul>

      <h3>6. Data Subject Rights</h3>
      <p>Under RA 10173, data subjects have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of personal data held by HearMeRead.</li>
        <li><strong>Correction:</strong> Request corrections to inaccurate personal data.</li>
        <li><strong>Erasure:</strong> Request deletion of personal data under certain conditions.</li>
        <li><strong>Portability:</strong> Request a portable copy of your data in a machine-readable format.</li>
        <li><strong>Object:</strong> Object to the processing of personal data in certain circumstances.</li>
      </ul>

      <h3>7. Data Security Measures</h3>
      <ul>
        <li>Student names and LRN are stored using Fernet symmetric encryption.</li>
        <li>Passwords are stored as bcrypt hashes and are never stored in plaintext.</li>
        <li>All data is transmitted over HTTPS.</li>
        <li>Access tokens expire after 60 minutes.</li>
      </ul>

      <h3>8. Third-Party Services</h3>
      <ul>
        <li><strong>Resend:</strong> Used for transactional email delivery (verification, password reset).</li>
        <li><strong>Railway:</strong> Cloud hosting provider for backend infrastructure.</li>
      </ul>
      <p>These providers are bound by their own data processing agreements and comply with applicable privacy laws.</p>

      <h3>9. Contact / Data Protection Officer</h3>
      <p>
        For privacy-related concerns, requests, or complaints, please contact us at:
        <br />
        <strong>hearmeread.dpo@gmail.com</strong>
      </p>
      <p>
        You also have the right to lodge a complaint with the National Privacy Commission (NPC)
        of the Philippines at <strong>www.privacy.gov.ph</strong>.
      </p>
    </>
  );
}
