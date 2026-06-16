import { useState, useMemo, useRef } from "react";
import { Eye, EyeOff, Check, X, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import LegalModal from "./LegalModal";
import TeacherTermsContent from "./legal/TeacherTermsContent";
import TeacherPrivacyContent from "./legal/TeacherPrivacyContent";
import AdminTermsContent from "./legal/AdminTermsContent";
import AdminPrivacyContent from "./legal/AdminPrivacyContent";
import "./component css/Auth.css";

const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "uppercase", label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "At least one number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "At least one symbol (e.g. !@#$)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  const passed = RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: "Weak", color: "#e74c3c" };
  if (passed === 2) return { score: 2, label: "Fair", color: "#f39c12" };
  if (passed === 3) return { score: 3, label: "Good", color: "#f1c40f" };
  if (passed === 4) return { score: 4, label: "Strong", color: "#2ecc71" };
  return { score: 5, label: "Very Strong", color: "#27ae60" };
}

export default function SignupForm({ onSubmit, loading }) {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const [role, setRole] = useState("teacher");
  const [adminDepedId, setAdminDepedId] = useState("");
  const [adminSchoolName, setAdminSchoolName] = useState("");
  const [teacherDepedId, setTeacherDepedId] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolLookupStatus, setSchoolLookupStatus] = useState("idle");
  const depedLookupTimer = useRef(null);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const ruleResults = useMemo(() => RULES.map((r) => ({ ...r, passed: r.test(password) })), [password]);
  const allRulesPassed = ruleResults.every((r) => r.passed);
  const strength = getStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const schoolReady = role === "teacher"
    ? teacherDepedId.trim().length > 0                                          // DepEd ID required; school code optional; match not required
    : adminSchoolName.trim().length > 0 && adminDepedId.trim().length > 0;

  function handleRoleSwitch(newRole) {
    setRole(newRole);
    setAdminDepedId(""); setAdminSchoolName("");
    setTeacherDepedId(""); setSchoolCode(""); setSchoolName("");
    setSchoolLookupStatus("idle");
    if (depedLookupTimer.current) clearTimeout(depedLookupTimer.current);
  }

  async function runLookup({ schoolCode: code, depedSchoolId: did }) {
    setSchoolLookupStatus("loading");
    try {
      const school = await authApi.lookupSchool({ schoolCode: code, depedSchoolId: did });
      setSchoolName(school.name);
      setSchoolLookupStatus("found");
      if (school.deped_school_id && !did) setTeacherDepedId(school.deped_school_id);
      if (school.school_code && !code) setSchoolCode(school.school_code);
    } catch {
      setSchoolName("");
      setSchoolLookupStatus("not_found");
    }
  }

  function resetLookup() {
    setSchoolName("");
    setSchoolLookupStatus("idle");
  }

  function handleTeacherDepedIdChange(e) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTeacherDepedId(val);
    resetLookup();
    if (depedLookupTimer.current) clearTimeout(depedLookupTimer.current);
    if (val.length === 6) {
      depedLookupTimer.current = setTimeout(() => runLookup({ depedSchoolId: val }), 400);
    }
  }

  function handleSchoolCodeChange(e) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setSchoolCode(val);
    resetLookup();
    if (val.length === 8) runLookup({ schoolCode: val });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!allRulesPassed) return;
    if (password !== confirmPassword) { setConfirmError("Passwords do not match."); return; }
    if (!schoolReady) return;
    if (!agreedToTerms || !agreedToPrivacy) return;
    setConfirmError("");
    onSubmit({
      firstName, lastName, email, password, role,
      depedSchoolId: role === "admin" ? adminDepedId.trim() : teacherDepedId.trim(),
      schoolCode: role === "teacher" ? schoolCode || undefined : undefined,
      schoolName: role === "admin" ? adminSchoolName : undefined,
      agreedToTerms, agreedToPrivacy,
    });
  }

  const canSubmit = !loading && allRulesPassed && passwordsMatch && schoolReady && agreedToTerms && agreedToPrivacy;

  const SchoolStatus = () => {
    if (schoolLookupStatus === "loading") return <span className="auth-field-hint" style={{ display: "flex", alignItems: "center", gap: 5 }}><Loader size={11} /> Looking up school…</span>;
    if (schoolLookupStatus === "found") return <span className="pw-match pw-match--ok"><Check size={12} /> {schoolName}</span>;
    if (schoolLookupStatus === "not_found") return <span className="pw-match pw-match--warn"><X size={12} /> No school found — you can still register and connect later</span>;
    return null;
  };

  const lookupClass = schoolLookupStatus === "found" ? " auth-input--success" : "";

  // ==========================================================================
  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit}>

        {/* Role toggle */}
        <div className="auth-role-toggle">
          <button type="button" className={`auth-role-toggle__btn${role === "teacher" ? " auth-role-toggle__btn--active" : ""}`} onClick={() => handleRoleSwitch("teacher")}>Teacher</button>
          <button type="button" className={`auth-role-toggle__btn${role === "admin" ? " auth-role-toggle__btn--active" : ""}`} onClick={() => handleRoleSwitch("admin")}>Admin</button>
        </div>

        {/* First Name + Last Name */}
        <div className="auth-form__row">
          <div className="auth-field-float">
            <input id="signup-firstname" type="text" className="auth-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder=" " required autoComplete="given-name" />
            <label className="auth-label-float" htmlFor="signup-firstname">First Name</label>
          </div>
          <div className="auth-field-float">
            <input id="signup-lastname" type="text" className="auth-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder=" " required autoComplete="family-name" />
            <label className="auth-label-float" htmlFor="signup-lastname">Last Name</label>
          </div>
        </div>

        {/* ══ TEACHER school fields ══════════════════════════════════════════ */}
        {role === "teacher" && (
          <>
            {/* Row: School Code | School ID */}
            <div className="auth-form__row">
              <div className="auth-field-float">
                <input id="signup-school-code" type="text" className={`auth-input${lookupClass}`} value={schoolCode} onChange={handleSchoolCodeChange} placeholder=" " maxLength={8} autoComplete="off" />
                <label className="auth-label-float" htmlFor="signup-school-code">School Code</label>
              </div>
              <div className="auth-field">
                <div className="auth-field-float">
                  <input id="teacher-deped-id" type="text" className={`auth-input${lookupClass}`} value={teacherDepedId} onChange={handleTeacherDepedIdChange} placeholder=" " maxLength={6} inputMode="numeric" autoComplete="off" />
                  <label className="auth-label-float" htmlFor="teacher-deped-id">School ID (DepEd)</label>
                </div>
                <SchoolStatus />
              </div>
            </div>

            {/* School Name (Full Width) */}
            <div className="auth-field-float">
              <input id="signup-school-name" type="text" className={`auth-input${schoolName ? " auth-input--success" : ""}`} value={schoolName} placeholder=" " readOnly />
              <label className="auth-label-float" htmlFor="signup-school-name">School Name</label>
            </div>

            {/* Email (Full Width) */}
            <div className="auth-field-float">
              <input id="signup-email" type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " required autoComplete="email" />
              <label className="auth-label-float" htmlFor="signup-email">Email</label>
            </div>
          </>
        )}

        {/* ══ ADMIN school fields ════════════════════════════════════════════ */}
        {role === "admin" && (
          <>
            {/* Row: School Name | School ID (DepEd) */}
            <div className="auth-form__row">
              <div className="auth-field-float">
                <input id="admin-school-name" type="text" className="auth-input" value={adminSchoolName} onChange={(e) => setAdminSchoolName(e.target.value)} placeholder=" " required autoComplete="organization" />
                <label className="auth-label-float" htmlFor="admin-school-name">School Name</label>
              </div>
              <div className="auth-field-float">
                <input id="admin-deped-id" type="text" className="auth-input" value={adminDepedId} onChange={(e) => setAdminDepedId(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder=" " required maxLength={6} inputMode="numeric" autoComplete="off" />
                <label className="auth-label-float" htmlFor="admin-deped-id">School ID (DepEd)</label>
              </div>
            </div>

            {/* Email — full width */}
            <div className="auth-field-float">
              <input id="signup-email" type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " required autoComplete="email" />
              <label className="auth-label-float" htmlFor="signup-email">Email</label>
            </div>
          </>
        )}

        {/* Passwords */}
        <div className="auth-form__row">
          <div className="auth-field">
            <div className="auth-field-float">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                className={`auth-input auth-input--has-toggle${touched && !allRulesPassed ? " auth-input--error" : ""}${touched && allRulesPassed ? " auth-input--success" : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
                placeholder=" "
                required
                autoComplete="new-password"
              />
              <label className="auth-label-float" htmlFor="signup-password">Password</label>
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {touched && password.length > 0 && (
              <div className="pw-strength">
                <div className="pw-strength__bar-track">
                  {[1, 2, 3, 4, 5].map((seg) => (
                    <div key={seg} className="pw-strength__bar-segment" style={{ background: seg <= strength.score ? strength.color : "#e0e4f0" }} />
                  ))}
                </div>
                <span className="pw-strength__label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}

            {touched && (
              <ul className="pw-rules">
                {ruleResults.map((rule) => (
                  <li key={rule.key} className={`pw-rule ${rule.passed ? "pw-rule--pass" : "pw-rule--fail"}`}>
                    {rule.passed ? <Check size={12} className="pw-rule__icon" /> : <X size={12} className="pw-rule__icon" />}
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="auth-field">
            <div className="auth-field-float">
              <input
                id="signup-confirm"
                type={showConfirm ? "text" : "password"}
                className={`auth-input auth-input--has-toggle${passwordsMismatch ? " auth-input--error" : ""}${passwordsMatch ? " auth-input--success" : ""}`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (confirmError) setConfirmError(""); }}
                placeholder=" "
                required
                autoComplete="new-password"
              />
              <label className="auth-label-float" htmlFor="signup-confirm">Confirm Password</label>
              <button type="button" className="auth-password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? "Hide password" : "Show password"}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {passwordsMatch && <span className="pw-match pw-match--ok"><Check size={12} /> Passwords match</span>}
            {(passwordsMismatch || confirmError) && (
              <span className="pw-match pw-match--error"><X size={12} /> {confirmError || "Passwords do not match"}</span>
            )}
          </div>
        </div>

        {/* Terms & Conditions checkbox */}
        <div className="auth-field--checkbox">
          <input type="checkbox" id="agree-terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
          <label className="auth-checkbox-label" htmlFor="agree-terms">
            I have read and agree to the{" "}
            <button type="button" className="auth-legal-link" onClick={() => setShowTermsModal(true)}>Terms &amp; Conditions</button>
          </label>
        </div>

        {/* Data Privacy Agreement checkbox */}
        <div className="auth-field--checkbox">
          <input type="checkbox" id="agree-privacy" checked={agreedToPrivacy} onChange={(e) => setAgreedToPrivacy(e.target.checked)} />
          <label className="auth-checkbox-label" htmlFor="agree-privacy">
            I have read and agree to the{" "}
            <button type="button" className="auth-legal-link" onClick={() => setShowPrivacyModal(true)}>Data Privacy Agreement</button>
          </label>
        </div>

        {/* Submit */}
        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading
            ? (role === "admin" ? "Creating school…" : "Creating account…")
            : (role === "admin" ? "Create Admin Account" : "Create Account")}
        </button>

        <p className="auth-switch">
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/login")}>Sign in</button>
        </p>

      </form>

      {showTermsModal && (
        <LegalModal title={role === "admin" ? "Admin Terms & Conditions" : "Terms & Conditions"} onClose={() => setShowTermsModal(false)}>
          {role === "admin" ? <AdminTermsContent /> : <TeacherTermsContent />}
        </LegalModal>
      )}

      {showPrivacyModal && (
        <LegalModal title={role === "admin" ? "Admin Data Privacy Agreement" : "Data Privacy Agreement"} onClose={() => setShowPrivacyModal(false)}>
          {role === "admin" ? <AdminPrivacyContent /> : <TeacherPrivacyContent />}
        </LegalModal>
      )}
    </>
  );
}