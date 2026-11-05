import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Users,
  BookOpen,
  ClipboardCheck,
  RotateCcw,
  AlertTriangle,
  Play,
  CheckCircle,
  ExternalLink,
  Lock,
  UserCheck,
  Database,
  Sliders,
  RefreshCw,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { testingApi, devSimulation, authApi } from "../services/api";

export default function DevTestingDashboard() {
  const navigate = useNavigate();

  // Active status
  const [statusData, setStatusData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Active auth state
  const [currentRole, setCurrentRole] = useState(localStorage.getItem("role") || "GUEST");
  const [hasToken, setHasToken] = useState(Boolean(localStorage.getItem("token")));

  // Generators state
  const [studentCount, setStudentCount] = useState(5);
  const [studentGrade, setStudentGrade] = useState("grade_2");
  const [generatingStudents, setGeneratingStudents] = useState(false);

  const [generatingPassages, setGeneratingPassages] = useState(false);
  const [incA1, setIncA1] = useState(true);
  const [incA2, setIncA2] = useState(true);

  const [assessmentCount, setAssessmentCount] = useState(3);
  const [generatingAssessments, setGeneratingAssessments] = useState(false);

  // Simulation state
  const [simErrorEnabled, setSimErrorEnabled] = useState(Boolean(devSimulation.getError()?.enabled));
  const [simErrorCode, setSimErrorCode] = useState(devSimulation.getError()?.status || 500);
  const [simLatencyMs, setSimLatencyMs] = useState(devSimulation.getLatency() || 0);
  const [simEmptyEnabled, setSimEmptyEnabled] = useState(devSimulation.getEmptyState());

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [preserveAccounts, setPreserveAccounts] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const refreshStatus = async () => {
    setLoadingStatus(true);
    setErrorMessage(null);
    try {
      const data = await testingApi.getStatus();
      setStatusData(data);
    } catch (err) {
      console.warn("Could not fetch testing status:", err);
      setErrorMessage("Backend testing endpoint not reachable or disabled in production.");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleLogin = (token, role, email) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    setCurrentRole(role);
    setHasToken(true);
    setActionMessage(`Switched login to ${role} (${email})`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleQuickSeedAndLogin = async (targetRole) => {
    try {
      setActionMessage("Seeding / retrieving predefined test accounts...");
      const res = await testingApi.seedAccounts();
      if (targetRole === "ADMIN") {
        handleLogin(res.admin_token, "ADMIN", res.admin_email);
      } else {
        handleLogin(res.teacher_token, "TEACHER", res.teacher_email);
      }
      refreshStatus();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to seed or log into test account.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setCurrentRole("GUEST");
    setHasToken(false);
    setActionMessage("Logged out successfully.");
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleGenerateStudents = async () => {
    setGeneratingStudents(true);
    setErrorMessage(null);
    try {
      const res = await testingApi.generateStudents({ count: Number(studentCount), grade_level: studentGrade });
      setActionMessage(res.message);
      refreshStatus();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to generate students. Ensure test accounts exist.");
    } finally {
      setGeneratingStudents(false);
    }
  };

  const handleGeneratePassages = async () => {
    setGeneratingPassages(true);
    setErrorMessage(null);
    try {
      const res = await testingApi.generatePassages({
        include_assessment_1: incA1,
        include_assessment_2: incA2,
      });
      setActionMessage(res.message);
      refreshStatus();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to generate passages.");
    } finally {
      setGeneratingPassages(false);
    }
  };

  const handleGenerateAssessments = async () => {
    setGeneratingAssessments(true);
    setErrorMessage(null);
    try {
      const res = await testingApi.generateAssessments({ count: Number(assessmentCount) });
      setActionMessage(res.message);
      refreshStatus();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to generate assessments. Ensure test passage and students exist.");
    } finally {
      setGeneratingAssessments(false);
    }
  };

  const handleApplySimulations = () => {
    if (simErrorEnabled) {
      devSimulation.setError({
        enabled: true,
        status: Number(simErrorCode),
        message: `Simulated HTTP ${simErrorCode} Error (from Dev Dashboard)`,
      });
    } else {
      devSimulation.setError(null);
    }

    devSimulation.setLatency(Number(simLatencyMs));
    devSimulation.setEmptyState(simEmptyEnabled);

    setActionMessage("Simulation settings updated successfully!");
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleResetSimulations = () => {
    devSimulation.setError(null);
    devSimulation.setLatency(0);
    devSimulation.setEmptyState(false);
    setSimErrorEnabled(false);
    setSimLatencyMs(0);
    setSimEmptyEnabled(false);
    setActionMessage("All simulations cleared.");
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleExecuteReset = async () => {
    if (confirmInput.trim().toUpperCase() !== "RESET") {
      setErrorMessage("Please type 'RESET' exactly to confirm.");
      return;
    }
    setIsResetting(true);
    setErrorMessage(null);
    try {
      const res = await testingApi.resetTestData({
        confirm: true,
        preserve_test_accounts: preserveAccounts,
      });
      setShowResetModal(false);
      setConfirmInput("");
      setActionMessage(res.message);
      refreshStatus();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to reset test data.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="container-fluid py-4 px-md-5 bg-light min-vh-100">
      {/* Top Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-4 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary px-3 py-2 rounded-pill fs-6">TESTING BRANCH</span>
            <span className="badge bg-secondary px-3 py-2 rounded-pill fs-6">DEV DB SHARED</span>
            <span className="badge bg-success px-3 py-2 rounded-pill fs-6">ISOLATION ACTIVE</span>
          </div>
          <h2 className="mt-2 mb-1 fw-bold text-dark">HearMeRead Developer Testing Dashboard</h2>
          <p className="text-muted mb-0 small">
            Dedicated environment for end-to-end testing, fictional data generation, permission validation, and API simulation.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
          <button
            onClick={refreshStatus}
            disabled={loadingStatus}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
          >
            <RefreshCw size={14} className={loadingStatus ? "spin" : ""} /> Refresh Status
          </button>
          <button
            onClick={() => navigate(currentRole === "ADMIN" ? "/admin/dashboard" : "/dashboard")}
            className="btn btn-primary btn-sm d-flex align-items-center gap-1"
          >
            Open Application <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 shadow-sm" role="alert">
          <CheckCircle size={18} />
          <div>{actionMessage}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setActionMessage(null)}></button>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 shadow-sm" role="alert">
          <AlertTriangle size={18} />
          <div>{errorMessage}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setErrorMessage(null)}></button>
        </div>
      )}

      {/* Active Session Status Card */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold d-flex align-items-center gap-2 text-primary">
                <UserCheck size={20} /> Predefined Test Accounts & Authentication
              </h5>
              <p className="text-muted small">
                Instantly switch authentication roles to test permissions without manual credentials entry.
              </p>

              <div className="p-3 bg-white border rounded mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <span className="text-muted small d-block">Current Active State:</span>
                  <span className={`badge ${currentRole === "ADMIN" ? "bg-danger" : currentRole === "TEACHER" ? "bg-success" : "bg-secondary"} fs-6`}>
                    {hasToken ? `${currentRole} (Authenticated)` : "GUEST (Unauthenticated)"}
                  </span>
                </div>
                {hasToken && (
                  <button onClick={handleLogout} className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1">
                    <LogOut size={14} /> Log Out
                  </button>
                )}
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <div className="p-3 border rounded bg-light h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between">
                        <strong className="text-danger">Admin Account</strong>
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">ADMIN</span>
                      </div>
                      <code className="d-block small mt-1 text-dark">test.admin@hearmeread.test</code>
                      <span className="text-muted small">Role: ADMIN (Full system & school access)</span>
                    </div>
                    <button
                      onClick={() => handleQuickSeedAndLogin("ADMIN")}
                      className="btn btn-outline-danger btn-sm mt-3 w-100 fw-semibold"
                    >
                      Quick Log In as Admin
                    </button>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="p-3 border rounded bg-light h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between">
                        <strong className="text-success">Teacher Account</strong>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">TEACHER</span>
                      </div>
                      <code className="d-block small mt-1 text-dark">test.teacher@hearmeread.test</code>
                      <span className="text-muted small">Role: TEACHER (Grade 2, Sampaguita)</span>
                    </div>
                    <button
                      onClick={() => handleQuickSeedAndLogin("TEACHER")}
                      className="btn btn-outline-success btn-sm mt-3 w-100 fw-semibold"
                    >
                      Quick Log In as Teacher
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Database & Isolation Guarantee Card */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold d-flex align-items-center gap-2 text-dark">
                <Database size={20} /> Data Isolation & Status
              </h5>
              <div className="list-group list-group-flush small mt-3">
                <div className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Environment Config:</span>
                  <strong className="text-dark">Backend/.env</strong>
                </div>
                <div className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Test Students:</span>
                  <span className="badge bg-primary rounded-pill">{statusData?.counts?.test_students ?? "—"}</span>
                </div>
                <div className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Test Passages:</span>
                  <span className="badge bg-primary rounded-pill">{statusData?.counts?.test_passages ?? "—"}</span>
                </div>
                <div className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Test Sessions:</span>
                  <span className="badge bg-primary rounded-pill">{statusData?.counts?.test_sessions ?? "—"}</span>
                </div>
                <div className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-muted">Protected Dev Students:</span>
                  <span className="badge bg-success rounded-pill">{statusData?.counts?.real_students ?? "—"}</span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-success-subtle border border-success-subtle rounded small text-success-emphasis">
                <strong>Safety Policy:</strong> Test entities are tagged with <code>[TEST]</code>. Resets strictly touch test records; real dev records are untouched.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Page Navigation Grid */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title fw-bold d-flex align-items-center gap-2 text-dark mb-3">
            <ExternalLink size={20} /> Direct Application Navigation
          </h5>
          <div className="row g-3">
            {/* Teacher Pages */}
            <div className="col-md-4">
              <div className="p-3 border rounded bg-white h-100">
                <div className="fw-bold text-success mb-2 d-flex align-items-center gap-1">
                  <Users size={16} /> Teacher Pages
                </div>
                <div className="d-flex flex-column gap-1 small">
                  <Link to="/dashboard" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Teacher Dashboard <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/assessment" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Conduct Reading Assessment <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/passages" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Passage Library <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/passages/add-assessment-1" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Add Assessment 1 Passage <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/passages/add-assessment-2" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Add Assessment 2 Passage <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/students" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Class Records & Students <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/students/add" className="text-decoration-none py-1 d-flex justify-content-between text-dark">
                    Add Student <ChevronRight size={14} className="text-muted" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Admin Pages */}
            <div className="col-md-4">
              <div className="p-3 border rounded bg-white h-100">
                <div className="fw-bold text-danger mb-2 d-flex align-items-center gap-1">
                  <ShieldAlert size={16} /> Admin Pages
                </div>
                <div className="d-flex flex-column gap-1 small">
                  <Link to="/admin/dashboard" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Admin Dashboard <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/admin/teachers" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Manage Teachers <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/admin/students" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Manage School Students <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/admin/passages" className="text-decoration-none py-1 d-flex justify-content-between text-dark">
                    Manage Public Passages <ChevronRight size={14} className="text-muted" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Public & Shared Pages */}
            <div className="col-md-4">
              <div className="p-3 border rounded bg-white h-100">
                <div className="fw-bold text-secondary mb-2 d-flex align-items-center gap-1">
                  <BookOpen size={16} /> Public & Auth Pages
                </div>
                <div className="d-flex flex-column gap-1 small">
                  <Link to="/login" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Login Page <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/signup" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Signup Page <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/profile" className="text-decoration-none py-1 border-bottom d-flex justify-content-between text-dark">
                    Profile Page <ChevronRight size={14} className="text-muted" />
                  </Link>
                  <Link to="/manual" className="text-decoration-none py-1 d-flex justify-content-between text-dark">
                    User Manual Page <ChevronRight size={14} className="text-muted" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generators & Simulation Row */}
      <div className="row g-4 mb-4">
        {/* Test Data Generators */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold d-flex align-items-center gap-2 text-dark mb-3">
                <Play size={20} /> Test Data Generators
              </h5>

              {/* Students Generator */}
              <div className="p-3 border rounded bg-white mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong className="text-dark small">1. Fictional Students</strong>
                  <span className="badge bg-secondary">Pre-tagged [TEST]</span>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">Count</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={studentCount}
                      onChange={(e) => setStudentCount(e.target.value)}
                      className="form-control form-control-sm"
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted mb-1">Grade Level</label>
                    <select
                      value={studentGrade}
                      onChange={(e) => setStudentGrade(e.target.value)}
                      className="form-select form-select-sm"
                    >
                      <option value="kindergarten">Kindergarten</option>
                      <option value="grade_1">Grade 1</option>
                      <option value="grade_2">Grade 2</option>
                      <option value="grade_3">Grade 3</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleGenerateStudents}
                  disabled={generatingStudents}
                  className="btn btn-outline-primary btn-sm w-100"
                >
                  {generatingStudents ? "Generating..." : `Generate ${studentCount} Students`}
                </button>
              </div>

              {/* Passages Generator */}
              <div className="p-3 border rounded bg-white mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong className="text-dark small">2. Sample Passages</strong>
                  <span className="badge bg-secondary">Pre-tagged [TEST]</span>
                </div>
                <div className="d-flex gap-3 mb-2 small text-muted">
                  <label className="d-flex align-items-center gap-1">
                    <input type="checkbox" checked={incA1} onChange={(e) => setIncA1(e.target.checked)} />
                    Assessment 1 (Tasks 1 & 2)
                  </label>
                  <label className="d-flex align-items-center gap-1">
                    <input type="checkbox" checked={incA2} onChange={(e) => setIncA2(e.target.checked)} />
                    Assessment 2 (Story + Questions)
                  </label>
                </div>
                <button
                  onClick={handleGeneratePassages}
                  disabled={generatingPassages || (!incA1 && !incA2)}
                  className="btn btn-outline-primary btn-sm w-100"
                >
                  {generatingPassages ? "Generating..." : "Generate Sample Passages"}
                </button>
              </div>

              {/* Assessment Results Generator */}
              <div className="p-3 border rounded bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong className="text-dark small">3. Sample Assessment Results</strong>
                  <span className="badge bg-secondary">CWPM & Scores</span>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-12">
                    <label className="form-label small text-muted mb-1">Session Count</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={assessmentCount}
                      onChange={(e) => setAssessmentCount(e.target.value)}
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerateAssessments}
                  disabled={generatingAssessments}
                  className="btn btn-outline-primary btn-sm w-100"
                >
                  {generatingAssessments ? "Generating..." : `Generate ${assessmentCount} Assessment Results`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* API & State Simulation Controls */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold d-flex align-items-center gap-2 text-dark mb-3">
                <Sliders size={20} /> Simulation & Boundary Controls
              </h5>
              <p className="text-muted small">
                Intercept and simulate conditions in frontend API calls to test edge cases, error boundaries, and loading skeletons.
              </p>

              {/* Error Simulation */}
              <div className="p-3 border rounded bg-white mb-3">
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="toggleSimError"
                    checked={simErrorEnabled}
                    onChange={(e) => setSimErrorEnabled(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold small" htmlFor="toggleSimError">
                    Simulate API Error
                  </label>
                </div>
                {simErrorEnabled && (
                  <div className="mt-2">
                    <label className="form-label small text-muted mb-1">Target HTTP Status</label>
                    <select
                      value={simErrorCode}
                      onChange={(e) => setSimErrorCode(e.target.value)}
                      className="form-select form-select-sm"
                    >
                      <option value="500">500 Internal Server Error</option>
                      <option value="403">403 Forbidden</option>
                      <option value="404">404 Not Found</option>
                      <option value="503">503 Service Unavailable</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Latency Simulation */}
              <div className="p-3 border rounded bg-white mb-3">
                <label className="form-label fw-semibold small mb-1">
                  Artificial Network Latency ({simLatencyMs} ms)
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="5000"
                  step="500"
                  value={simLatencyMs}
                  onChange={(e) => setSimLatencyMs(e.target.value)}
                />
                <div className="d-flex justify-content-between small text-muted">
                  <span>0ms (Instant)</span>
                  <span>1000ms</span>
                  <span>2500ms</span>
                  <span>5000ms (Slow)</span>
                </div>
              </div>

              {/* Empty State Simulation */}
              <div className="p-3 border rounded bg-white mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="toggleSimEmpty"
                    checked={simEmptyEnabled}
                    onChange={(e) => setSimEmptyEnabled(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold small" htmlFor="toggleSimEmpty">
                    Simulate Empty State (Return 0 students & passages)
                  </label>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button onClick={handleApplySimulations} className="btn btn-primary btn-sm flex-grow-1">
                  Apply Simulation Settings
                </button>
                <button onClick={handleResetSimulations} className="btn btn-outline-secondary btn-sm">
                  Clear Simulations
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset & Reseed Section */}
      <div className="card shadow-sm border-0 border-top border-danger border-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h5 className="fw-bold text-danger mb-1 d-flex align-items-center gap-2">
                <RotateCcw size={20} /> Reset & Reseed Test Data
              </h5>
              <p className="text-muted small mb-0">
                Safely purges test records created by this environment. Real development database records are completely preserved.
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="btn btn-danger btn-sm px-4 fw-semibold d-flex align-items-center gap-1"
            >
              <RotateCcw size={14} /> Reset Test Data...
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <AlertTriangle size={18} /> Confirm Test Data Reset
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowResetModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="small text-muted">
                  This action will safely remove all test records created with prefix <code>[TEST]</code>:
                </p>
                <ul className="small text-muted mb-3">
                  <li>Test reading sessions and observations</li>
                  <li>Test passages and associated questions</li>
                  <li>Test student records</li>
                </ul>

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="preserveAcc"
                    checked={preserveAccounts}
                    onChange={(e) => setPreserveAccounts(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="preserveAcc">
                    Keep test accounts (<code>test.admin@...</code> and <code>test.teacher@...</code>)
                  </label>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">
                    Type <code className="text-danger">RESET</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="RESET"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleExecuteReset}
                  disabled={isResetting || confirmInput.trim().toUpperCase() !== "RESET"}
                >
                  {isResetting ? "Resetting..." : "Confirm & Delete Test Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
