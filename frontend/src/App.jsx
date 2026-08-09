import React, { useState, useEffect, useRef, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoadingPage from "./pages/LoadingPage";
import axios from "axios";
import api, { authApi, dashboardApi } from "./services/api";

// Lazy-loaded pages
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const SignupPage = React.lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const SignupSuccessPage = React.lazy(() => import("./pages/SignupSuccessPage"));

const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const PassagePage = React.lazy(() => import("./pages/passages/PassagePage"));
const AddAssessment1Page = React.lazy(() => import("./pages/passages/AddAssessment1Page"));
const AddAssessment2Page = React.lazy(() => import("./pages/passages/AddAssessment2Page"));
const EditAssessment1Page = React.lazy(() => import("./pages/passages/EditAssessment1Page"));
const EditAssessment2Page = React.lazy(() => import("./pages/passages/EditAssessment2Page"));
const StudentRecordPage = React.lazy(() => import("./pages/Student/StudentRecordPage"));
const AddStudentPage = React.lazy(() => import("./pages/Student/AddStudentPage"));
const AssessmentPage = React.lazy(() => import("./pages/Assessment/AssessmentPage"));
const StudentInfoPage = React.lazy(() => import("./pages/Student/StudentInfoPage"));
const ClassRecordPage = React.lazy(() => import("./pages/Student/ClassRecordPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const UserManualPage = React.lazy(() => import("./pages/UserManualPage"));

const AdminDashboardPage = React.lazy(() => import("./pages/AdminDashboardPage"));
const AdminTeachersPage = React.lazy(() => import("./pages/AdminTeachersPage"));
const AdminStudentsPage = React.lazy(() => import("./pages/AdminStudentsPage"));
const AdminPassagesPage = React.lazy(() => import("./pages/AdminPassagesPage"));

function getRole() {
  return localStorage.getItem("role") || "TEACHER";
}

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireTeacher({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  if (getRole() === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  if (getRole() !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireGuest({ children }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to={getRole() === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
  return children;
}

function CatchAll() {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return <Navigate to={getRole() === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function forceLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.replace("/login");
}

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [firstCheckDone, setFirstCheckDone] = useState(false);
  const [secondCheckDone, setSecondCheckDone] = useState(false);
  const idleTimer = useRef(null);

  // Sync loading sequence with backend health check and optional auth details fetch
  useEffect(() => {
    const rootUrl = api.defaults.baseURL.replace('/routes', '');
    
    // Check 1: Ping root endpoint of backend
    axios.get(rootUrl)
      .then(() => {
        setFirstCheckDone(true);
        
        // Check 2: If backend is online, check token validation or simulate asset load delay
        const token = localStorage.getItem("token");
        if (token) {
          authApi.me()
            .then(() => {
              // Fetch dashboard summary stats to pre-cache / sync
              return dashboardApi.getSummary()
                .then(() => setSecondCheckDone(true))
                .catch(() => setSecondCheckDone(true));
            })
            .catch(() => {
              // If token is invalid or expired, continue load
              setSecondCheckDone(true);
            });
        } else {
          // Guest mode check: brief delay for resource allocation
          setTimeout(() => setSecondCheckDone(true), 400);
        }
      })
      .catch((err) => {
        console.warn("Backend connection failed, proceeding with app load:", err);
        setFirstCheckDone(true);
        setSecondCheckDone(true);
      });
  }, []);

  // Update progress state based on sync check status
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < 70) {
          // Normal progressive growth towards Green
          return prev + 5;
        } else if (prev === 70) {
          // Halt at Green (70) until firstCheckDone (backend ping) is true
          if (firstCheckDone) {
            return prev + 5;
          }
          return prev;
        } else if (prev < 85) {
          // Progress towards Red
          return prev + 5;
        } else if (prev === 85) {
          // Halt at Red (85) until secondCheckDone (details / auth pre-fetch) is true
          if (secondCheckDone) {
            return prev + 5;
          }
          return prev;
        } else if (prev < 100) {
          // Progress towards Dark Blue (100)
          return prev + 5;
        } else {
          clearInterval(timer);
          // Briefly display completed dark blue ring before transition
          setTimeout(() => setAppReady(true), 350);
          return 100;
        }
      });
    }, 100);

    return () => clearInterval(timer);
  }, [firstCheckDone, secondCheckDone]);

  // Silently redirect to login on 401 — no modal
  useEffect(() => {
    const handler = () => forceLogout();
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  // Idle timeout — log out after 30 min of no activity
  useEffect(() => {
    function resetIdleTimer() {
      if (!localStorage.getItem("token")) return;
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(forceLogout, IDLE_TIMEOUT_MS);
    }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // start on mount

    return () => {
      clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, []);

  if (!appReady) return <LoadingPage progress={loadingProgress} />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RequireGuest><LandingPage /></RequireGuest>} />
          <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
          <Route path="/signup" element={<RequireGuest><SignupPage /></RequireGuest>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/signup/success" element={<SignupSuccessPage />} />

          {/* Teacher-only */}
          <Route path="/dashboard" element={<RequireTeacher><DashboardPage /></RequireTeacher>} />
          <Route path="/assessment" element={<RequireTeacher><AssessmentPage /></RequireTeacher>} />
          <Route path="/passages" element={<RequireTeacher><PassagePage /></RequireTeacher>} />
          <Route path="/passages/add-assessment-1" element={<RequireTeacher><AddAssessment1Page /></RequireTeacher>} />
          <Route path="/passages/add-assessment-2" element={<RequireTeacher><AddAssessment2Page /></RequireTeacher>} />
          <Route path="/passages/edit-assessment-1/:id" element={<RequireTeacher><EditAssessment1Page /></RequireTeacher>} />
          <Route path="/passages/edit-assessment-2/:id" element={<RequireTeacher><EditAssessment2Page /></RequireTeacher>} />
          <Route path="/students" element={<RequireTeacher><StudentRecordPage /></RequireTeacher>} />
          <Route path="/students/add" element={<RequireTeacher><AddStudentPage /></RequireTeacher>} />
          <Route path="/students/class" element={<RequireTeacher><ClassRecordPage /></RequireTeacher>} />
          <Route path="/students/:id" element={<RequireTeacher><StudentInfoPage /></RequireTeacher>} />

          {/* Admin-only */}
          <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
          <Route path="/admin/teachers" element={<RequireAdmin><AdminTeachersPage /></RequireAdmin>} />
          <Route path="/admin/students" element={<RequireAdmin><AdminStudentsPage /></RequireAdmin>} />
          <Route path="/admin/passages" element={<RequireAdmin><AdminPassagesPage /></RequireAdmin>} />

          {/* Shared */}
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/manual" element={<RequireAuth><UserManualPage /></RequireAuth>} />

          <Route path="*" element={<CatchAll />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
