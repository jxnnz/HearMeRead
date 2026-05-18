export default function AdminPrivacyContent() {
  return (
    <>
      <p className="legal-updated">
        Effective Date: May 17, 2026 &middot; Last Updated: May 17, 2026
        <br />
        In accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations
      </p>

      <p>
        This Data Privacy Agreement (&ldquo;Agreement&rdquo;) describes how <strong>HearMeRead</strong> (&ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, stores, protects, and disposes of personal information
        when you (&ldquo;Administrator,&rdquo; &ldquo;Admin,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) use the
        HearMeRead platform in an administrative capacity (the &ldquo;Service&rdquo;). This Agreement is designed to
        comply with RA 10173, its IRR, and applicable issuances of the National Privacy Commission (NPC).
      </p>

      {/* Section 1 */}
      <h3>1. Administrator as Co-Personal Information Controller</h3>
      <p>
        By registering as a School Administrator on HearMeRead, you acknowledge and accept the role of{" "}
        <strong>co-Personal Information Controller (co-PIC)</strong> under Republic Act No. 10173 for all
        personal data processed within your school&rsquo;s HearMeRead account. This means you share
        responsibility with HearMeRead for determining the purposes and means of data processing within
        your school, and for ensuring that all processing is lawful, fair, and transparent.
      </p>
      <p>
        <strong>HearMeRead</strong> also acts as a Personal Information Controller for data it processes
        directly (e.g., administrator account data, platform-level operations). For inquiries, you may contact:
      </p>
      <ul>
        <li><strong>Data Protection Officer (DPO):</strong> HearMeRead DPO</li>
        <li><strong>Email:</strong> hearmereadsite@gmail.com</li>
      </ul>

      {/* Section 2 */}
      <h3>2. Types of Personal Information Collected</h3>
      <p>
        As an Administrator, you have visibility over a broader scope of personal data than Teachers.
        The following categories of data are collected and processed within your school&rsquo;s account:
      </p>

      <h3>2.1 Administrator Information (Data Subject: You)</h3>
      <ul>
        <li>Full name (first name, last name)</li>
        <li>Email address</li>
        <li>Password (stored as a bcrypt hash; never stored in plaintext)</li>
        <li>School name and DepEd School ID</li>
        <li>School code (auto-generated upon registration)</li>
        <li>Account status, verification status, and role designation</li>
        <li>Date of registration and last login</li>
      </ul>

      <h3>2.2 Teacher Information (Data Subjects: Teachers in Your School)</h3>
      <ul>
        <li>Full name (first name, last name)</li>
        <li>Email address</li>
        <li>Verification status and account status</li>
        <li>Date joined and last active date</li>
        <li>Assigned sections and grade levels</li>
      </ul>

      <h3>2.3 Student Information (Data Subjects: Students, represented by Parents/Guardians)</h3>
      <ul>
        <li>Full name (first name, last name) — <em>encrypted at rest using Fernet symmetric encryption</em></li>
        <li>Learner Reference Number (LRN) — <em>encrypted at rest using Fernet symmetric encryption</em></li>
        <li>Grade level and section</li>
        <li>Sex</li>
        <li>School year</li>
      </ul>

      <h3>2.4 Assessment Data</h3>
      <ul>
        <li>Oral reading assessment scores</li>
        <li>Correct Words Per Minute (CWPM) results</li>
        <li>Comprehension scores</li>
        <li>Reading level classification</li>
        <li>Audio recordings of reading sessions — <em>temporary; automatically deleted within 7 days</em></li>
        <li>ASR-generated transcriptions</li>
        <li>School-wide aggregate analytics and reports</li>
      </ul>

      <h3>2.5 Technical Data (Automatically Collected)</h3>
      <ul>
        <li>IP address and browser user-agent (for security and access logging)</li>
        <li>Session tokens and authentication metadata</li>
        <li>Service usage patterns (pages accessed, features used)</li>
      </ul>

      {/* Section 3 */}
      <h3>3. Sensitive Personal Information</h3>
      <p>
        Under RA 10173, <strong>information about a child</strong> (a person under 18 years old) is
        considered sensitive personal information. Student data processed through HearMeRead falls under
        this category. As a co-PIC, you have heightened responsibilities:
      </p>
      <ul>
        <li>You must ensure that teachers under your school obtain verified parental or guardian consent
          before entering any student data;</li>
        <li>You must implement organizational measures to ensure student data is handled with the highest
          level of protection;</li>
        <li>Student data is subject to strict purpose limitation and data minimization principles;</li>
        <li>Enhanced security measures (encryption, access controls) are applied to all student data.</li>
      </ul>

      {/* Section 4 */}
      <h3>4. Purposes of Data Processing</h3>
      <p>We process personal information for the following specified, legitimate purposes:</p>
      <ul>
        <li><strong>Service Delivery:</strong> To provide, maintain, and improve the oral reading assessment Service;</li>
        <li><strong>School Administration:</strong> To enable school-level management of teacher accounts,
          student records, and assessment data;</li>
        <li><strong>Assessment:</strong> To facilitate automated reading fluency assessments aligned with DepEd guidelines;</li>
        <li><strong>Reporting:</strong> To generate individual student, classroom-level, and school-wide
          reading performance reports and aggregate analytics;</li>
        <li><strong>Monitoring:</strong> To support Administrators in monitoring literacy outcomes across
          classrooms and identifying areas for instructional improvement;</li>
        <li><strong>Account Management:</strong> To manage user accounts, authentication, email verification,
          and password recovery;</li>
        <li><strong>Security:</strong> To detect, prevent, and respond to fraud, abuse, and security incidents;</li>
        <li><strong>Compliance:</strong> To comply with legal obligations under RA 10173, DepEd directives,
          and other applicable laws;</li>
        <li><strong>Communication:</strong> To send transactional emails (verification, password reset,
          account notifications).</li>
      </ul>
      <p>
        We do <strong>not</strong> process personal data for profiling, automated decision-making with
        legal effects, marketing, advertising, or any purpose unrelated to educational assessment and
        school administration.
      </p>

      {/* Section 5 */}
      <h3>5. Legal Basis for Processing (RA 10173, Sections 12 and 13)</h3>
      <p>
        We process personal information based on the following lawful criteria under the Data Privacy Act of 2012:
      </p>
      <ul>
        <li>
          <strong>Consent</strong> (Section 12(a) / Section 13(a)): Your consent as data subject for your
          administrator data; teacher consent for their own data; and parental/guardian consent for student
          data (sensitive personal information of minors).
        </li>
        <li>
          <strong>Contractual Necessity</strong> (Section 12(b)): Processing necessary for the performance
          of this agreement and the provision of the Service.
        </li>
        <li>
          <strong>Legal Obligation</strong> (Section 12(c)): Compliance with DepEd assessment requirements,
          reporting mandates, and data governance directives.
        </li>
        <li>
          <strong>Legitimate Interests</strong> (Section 12(f)): The legitimate interest of the school
          and HearMeRead in monitoring and improving student literacy outcomes at the school level,
          provided that such interests are not overridden by the fundamental rights and freedoms of the
          data subjects.
        </li>
      </ul>

      {/* Section 6 */}
      <h3>6. Administrator Obligations Under RA 10173</h3>
      <p>
        As a co-PIC, you have the following specific obligations under the Data Privacy Act and its IRR:
      </p>
      <ul>
        <li>
          <strong>Access Control:</strong> Ensure only authorized teachers are given access to your
          school&rsquo;s HearMeRead account via the school code. Promptly revoke access for teachers
          who are no longer authorized.
        </li>
        <li>
          <strong>Consent Verification:</strong> Ensure teachers under your school obtain appropriate
          written parental/guardian consent before entering student data into the system.
        </li>
        <li>
          <strong>Breach Reporting:</strong> Report any actual or suspected personal data breach to
          HearMeRead at <strong>hearmeread.dpo@gmail.com</strong> within <strong>twenty-four (24) hours</strong>{" "}
          of discovery. Cooperate with HearMeRead in reporting to the NPC within the legally mandated
          seventy-two (72) hours.
        </li>
        <li>
          <strong>Data Subject Rights Facilitation:</strong> Facilitate the exercise of data subject
          rights (access, correction, erasure, portability) within your school. Escalate requests to
          HearMeRead when necessary.
        </li>
        <li>
          <strong>NPC Cooperation:</strong> Cooperate with any investigation, audit, or compliance
          review by the National Privacy Commission.
        </li>
        <li>
          <strong>Organizational Measures:</strong> Implement reasonable organizational measures within
          your school to ensure data is used only for its stated educational purposes.
        </li>
        <li>
          <strong>Teacher Compliance:</strong> Ensure that all teachers under your school are informed
          of and comply with the Data Privacy Agreement and Terms and Conditions before using the Service.
        </li>
        <li>
          <strong>Privacy Impact Assessment:</strong> Support HearMeRead in conducting Privacy Impact
          Assessments (PIAs) as required by the NPC, particularly when new processing activities are
          introduced within your school.
        </li>
      </ul>

      {/* Section 7 */}
      <h3>7. Data Minimization and Proportionality</h3>
      <p>
        In accordance with the principles of RA 10173, we collect only the personal information that
        is <strong>adequate, relevant, and necessary</strong> for the declared purposes. As an Administrator,
        you must ensure that teachers within your school likewise adhere to data minimization principles
        and do not collect student information beyond what is required for reading assessment.
      </p>

      {/* Section 8 */}
      <h3>8. Data Retention and Disposal</h3>
      <p>
        We retain personal information only for as long as necessary to fulfill the purposes for which
        it was collected, or as required by law:
      </p>
      <ul>
        <li><strong>Administrator account data:</strong> Retained for the duration of the active account.
          Upon account deletion request, all data will be permanently erased within thirty (30) days.</li>
        <li><strong>Teacher account data:</strong> Retained for the duration of the teacher&rsquo;s
          active account. Upon school account termination, all teacher data under the school will be
          permanently erased within thirty (30) days.</li>
        <li><strong>Student records and assessment data:</strong> Retained for the duration of the
          associated teacher&rsquo;s or school&rsquo;s active account. Upon account deletion, all
          student data will be permanently erased within thirty (30) days.</li>
        <li><strong>Audio recordings:</strong> Automatically deleted within seven (7) days of recording.
          Audio data is used solely for generating transcription and scoring results.</li>
        <li><strong>Access logs and security data:</strong> Retained for a maximum of ninety (90) days
          for security monitoring purposes, then automatically purged.</li>
      </ul>
      <p>
        Upon expiration of the retention period, personal data will be disposed of in a secure manner
        that prevents unauthorized access, use, or disclosure, in compliance with RA 10173 and NPC guidelines.
      </p>

      {/* Section 9 */}
      <h3>9. Data Subject Rights</h3>
      <p>
        Under RA 10173 (Sections 16–18), all data subjects — including Administrators, Teachers,
        Students (through their parents/guardians) — have the following rights. These rights may be
        exercised by contacting our DPO at <strong>hearmereadsite@gmail.com</strong>:
      </p>
      <ul>
        <li>
          <strong>Right to Be Informed</strong> (Section 16(a)): The right to be informed of the
          collection and processing of personal data, including the purposes, scope, and method of processing.
        </li>
        <li>
          <strong>Right to Access</strong> (Section 16(c)): The right to request and obtain a copy of
          personal data held by HearMeRead, including information about how the data has been processed.
        </li>
        <li>
          <strong>Right to Correction</strong> (Section 16(d)): The right to dispute and request correction
          of any inaccurate, incomplete, outdated, or misleading personal data.
        </li>
        <li>
          <strong>Right to Erasure or Blocking</strong> (Section 16(e)): The right to request the
          suspension, withdrawal, blocking, removal, or destruction of personal data under certain
          conditions, including when the data is incomplete, outdated, falsely obtained, used for
          unauthorized purposes, or no longer necessary for the stated purpose.
        </li>
        <li>
          <strong>Right to Data Portability</strong> (Section 18): The right to obtain personal data in
          an electronic or structured format that is commonly used and allows for further use.
        </li>
        <li>
          <strong>Right to Object</strong> (Section 16(c)): The right to object to the processing of
          personal data, including processing for direct marketing, automated processing, or profiling.
        </li>
        <li>
          <strong>Right to Damages</strong> (Section 16(f)): The right to be indemnified for damages
          sustained due to inaccurate, incomplete, outdated, falsely obtained, or unauthorized use of
          personal data.
        </li>
        <li>
          <strong>Right to File a Complaint</strong>: The right to lodge a complaint with the National
          Privacy Commission at <strong>www.privacy.gov.ph</strong>.
        </li>
      </ul>
      <p>
        We will respond to valid data subject requests within fifteen (15) business days of receipt.
        As an Administrator, you must facilitate the exercise of these rights within your school and
        escalate requests to HearMeRead when necessary.
      </p>

      {/* Section 10 */}
      <h3>10. Data Security Measures</h3>
      <p>
        We implement reasonable and appropriate organizational, physical, and technical security measures
        to protect personal data against unauthorized access, disclosure, alteration, or destruction,
        in compliance with RA 10173 and NPC Circular No. 2016-01:
      </p>

      <h3>10.1 Technical Measures</h3>
      <ul>
        <li><strong>Encryption at Rest:</strong> Student names and LRN are encrypted using Fernet
          symmetric encryption (AES-128-CBC with HMAC-SHA256).</li>
        <li><strong>Encryption in Transit:</strong> All data is transmitted over HTTPS (TLS 1.2+).</li>
        <li><strong>Password Security:</strong> Passwords are hashed using bcrypt with a computational
          cost factor and are never stored in plaintext.</li>
        <li><strong>Access Tokens:</strong> JWT-based access tokens expire after sixty (240) minutes.
          Refresh tokens are rotated on each use.</li>
        <li><strong>School Code Access Control:</strong> School codes provide an additional layer of
          access control, ensuring that only teachers with a valid code can register under a school.</li>
        <li><strong>Input Validation:</strong> Server-side validation and sanitization of all user
          inputs to prevent injection attacks.</li>
      </ul>

      <h3>10.2 Organizational Measures</h3>
      <ul>
        <li>Role-based access control with distinct permission levels for Administrators and Teachers;</li>
        <li>Administrators can view school-wide data; Teachers can only access data within their assigned sections;</li>
        <li>School-code-based registration restricting teacher onboarding to authorized schools;</li>
        <li>Regular review of access permissions and security configurations;</li>
        <li>Designated Data Protection Officer responsible for privacy compliance.</li>
      </ul>

      {/* Section 11 */}
      <h3>11. Data Sharing and Third-Party Services</h3>
      <p>
        We may share personal data with the following categories of third-party service providers,
        strictly for the purposes of operating and maintaining the Service:
      </p>
      <ul>
        <li>
          <strong>Resend (Email Service Provider):</strong> Used for transactional email delivery,
          including account verification, password reset, and critical notifications. Resend processes
          only email addresses and message content necessary for delivery.
        </li>
        <li>
          <strong>Railway (Cloud Hosting Provider):</strong> Backend infrastructure hosting. All data
          stored on Railway is subject to Railway&rsquo;s data processing terms and security practices.
        </li>
        <li>
          <strong>Cloudflare (CDN / Frontend Hosting):</strong> Frontend application hosting and
          content delivery.
        </li>
      </ul>
      <p>
        These third-party providers are bound by their respective data processing agreements and privacy
        policies. We ensure that they provide sufficient guarantees to implement appropriate technical
        and organizational measures consistent with RA 10173.
      </p>
      <p>
        We do <strong>not</strong> sell, rent, trade, or otherwise commercially share personal data with
        any third party. We do <strong>not</strong> share personal data with advertisers, analytics
        companies, or data brokers.
      </p>

      {/* Section 12 */}
      <h3>12. Cross-Border Data Transfer</h3>
      <p>
        Some of our third-party service providers may process data outside the Philippines. In such cases,
        we ensure that:
      </p>
      <ul>
        <li>The recipient country provides an adequate level of data protection as determined by the NPC,
          or appropriate safeguards are in place (Section 21, RA 10173);</li>
        <li>Data transfers are covered by contractual data processing agreements;</li>
        <li>You are informed of the countries where your data may be processed.</li>
      </ul>
      <p>
        Currently, data may be processed in the United States (Railway and Resend infrastructure).
      </p>

      {/* Section 13 */}
      <h3>13. Automated Processing and Profiling</h3>
      <p>
        The Service uses automated speech recognition (ASR) technology to transcribe and score student
        reading sessions. This automated processing:
      </p>
      <ul>
        <li>Is used solely to generate assessment metrics (CWPM, miscue analysis, comprehension scores);</li>
        <li>Does not produce legal effects or similarly significant effects on any individual;</li>
        <li>Results are subject to teacher review and manual correction before being finalized;</li>
        <li>Does not involve profiling, behavioral tracking, or automated decision-making as defined
          under RA 10173.</li>
      </ul>

      {/* Section 14 */}
      <h3>14. Cookies and Local Storage</h3>
      <p>
        The Service uses only essential, functional cookies and browser local storage for authentication
        and session management. We do <strong>not</strong> use tracking cookies, advertising cookies,
        or third-party analytics cookies.
      </p>

      {/* Section 15 */}
      <h3>15. Data Breach Notification and Response</h3>
      <p>
        In the event of a personal data breach that is likely to affect the rights and freedoms of data
        subjects, the following procedures apply:
      </p>

      <h3>15.1 HearMeRead&rsquo;s Obligations</h3>
      <ul>
        <li>Notify the <strong>National Privacy Commission (NPC)</strong> within <strong>seventy-two (72)
          hours</strong> of becoming aware of the breach, as required by RA 10173 and NPC Circular No. 2016-03;</li>
        <li>Notify affected School Administrators within a reasonable time after discovery;</li>
        <li>Provide information about the nature of the breach, the personal data involved, the likely
          consequences, and the measures taken or proposed to address the breach;</li>
        <li>Document all breaches, including those that do not meet the notification threshold.</li>
      </ul>

      <h3>15.2 Administrator&rsquo;s Obligations</h3>
      <ul>
        <li>Report any actual or suspected breach to HearMeRead at <strong>hearmeread.dpo@gmail.com</strong>{" "}
          within <strong>twenty-four (24) hours</strong> of discovery;</li>
        <li>Notify affected data subjects (teachers, parents/guardians) within your school as required
          by RA 10173;</li>
        <li>Cooperate with HearMeRead in investigating, containing, and remediating the breach;</li>
        <li>Maintain records of all breach incidents within your school.</li>
      </ul>

      {/* Section 16 */}
      <h3>16. Changes to This Agreement</h3>
      <p>
        We reserve the right to update this Data Privacy Agreement at any time. Changes will be effective
        upon posting the updated Agreement on the Service with a revised &ldquo;Last Updated&rdquo; date.
        We will notify registered Administrators of material changes via email at least fifteen (15)
        days before the changes take effect. Your continued use of the Service after any modification
        constitutes your acceptance of the revised Agreement.
      </p>

      {/* Section 17 */}
      <h3>17. Contact / Data Protection Officer</h3>
      <p>
        For privacy-related concerns, requests, complaints, or to exercise your data subject rights,
        please contact:
      </p>
      <ul>
        <li><strong>Data Protection Officer:</strong> HearMeRead DPO</li>
        <li><strong>Email:</strong> hearmereadsite@gmail.com</li>
      </ul>
      <p>
        You also have the right to lodge a complaint with the <strong>National Privacy Commission (NPC)</strong>{" "}
        of the Philippines:
      </p>
      <ul>
        <li><strong>Website:</strong> www.privacy.gov.ph</li>
        <li><strong>Email:</strong> complaints@privacy.gov.ph</li>
      </ul>
    </>
  );
}
