import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SessionExpiredModal from "./modals/SessionExpiredModal";
import LandingPage      from "./pages/LandingPage";
import LoadingPage      from "./pages/LoadingPage";
import LoginPage           from "./pages/LoginPage";
import SignupPage          from "./pages/SignupPage";
import ForgotPasswordPage  from "./pages/ForgotPasswordPage";
import ResetPasswordPage   from "./pages/ResetPasswordPage";
import DashboardPage    from "./pages/DashboardPage";
import PassagePage      from "./pages/passages/PassagePage";
import AddAssessment1Page  from "./pages/passages/AddAssessment1Page";
import AddAssessment2Page  from "./pages/passages/AddAssessment2Page";
import EditAssessment1Page from "./pages/passages/EditAssessment1Page";
import EditAssessment2Page from "./pages/passages/EditAssessment2Page";
import StudentRecordPage from "./pages/Student/StudentRecordPage";
import AddStudentPage   from "./pages/Student/AddStudentPage";
import AssessmentPage   from "./pages/Assessment/AssessmentPage";
import StudentInfoPage  from "./pages/Student/StudentInfoPage";
import ClassRecordPage  from "./pages/Student/ClassRecordPage";
import SignupSuccessPage   from "./pages/SignupSuccessPage";
import AdminDashboardPage  from "./pages/AdminDashboardPage";
import AdminTeachersPage   from "./pages/AdminTeachersPage";
import AdminStudentsPage   from "./pages/AdminStudentsPage";


function getRole() {
  return localStorage.getItem("role") || "TEACHER";
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

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = () => setSessionExpired(true);
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  if (!appReady) return <LoadingPage />;

  return (
    <>
    <SessionExpiredModal isOpen={sessionExpired} />
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"            element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/signup"           element={<RequireGuest><SignupPage /></RequireGuest>} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />
        <Route path="/signup/success"   element={<SignupSuccessPage />} />

        {/* ── Teacher-only ── */}
        <Route path="/dashboard"   element={<RequireTeacher><DashboardPage /></RequireTeacher>} />
        <Route path="/assessment"  element={<RequireTeacher><AssessmentPage /></RequireTeacher>} />
        <Route path="/passages"                  element={<RequireTeacher><PassagePage /></RequireTeacher>} />
        <Route path="/passages/add-assessment-1"      element={<RequireTeacher><AddAssessment1Page /></RequireTeacher>} />
        <Route path="/passages/add-assessment-2"      element={<RequireTeacher><AddAssessment2Page /></RequireTeacher>} />
        <Route path="/passages/edit-assessment-1/:id" element={<RequireTeacher><EditAssessment1Page /></RequireTeacher>} />
        <Route path="/passages/edit-assessment-2/:id" element={<RequireTeacher><EditAssessment2Page /></RequireTeacher>} />
        <Route path="/students"              element={<RequireTeacher><StudentRecordPage /></RequireTeacher>} />
        <Route path="/students/add"          element={<RequireTeacher><AddStudentPage /></RequireTeacher>} />
        <Route path="/students/class"        element={<RequireTeacher><ClassRecordPage /></RequireTeacher>} />
        <Route path="/students/:id"          element={<RequireTeacher><StudentInfoPage /></RequireTeacher>} />

        {/* ── Admin-only ── */}
        <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="/admin/teachers"  element={<RequireAdmin><AdminTeachersPage /></RequireAdmin>} />
        <Route path="/admin/students"  element={<RequireAdmin><AdminStudentsPage /></RequireAdmin>} />

        <Route path="*" element={<CatchAll />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}
