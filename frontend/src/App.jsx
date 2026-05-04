import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
// import ASRTestPage      from "./pages/ASRTestPage";
import AssessmentPage   from "./pages/Assessment/AssessmentPage";
import StudentInfoPage  from "./pages/Student/StudentInfoPage";
import ClassRecordPage  from "./pages/Student/ClassRecordPage";


function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireGuest({ children }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function CatchAll() {
  const token = localStorage.getItem("token");
  return <Navigate to={token ? "/dashboard" : "/"} replace />;
}

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!appReady) return <LoadingPage />;

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"            element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/signup"           element={<RequireGuest><SignupPage /></RequireGuest>} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />

        {/* ── Protected ── */}
        <Route path="/dashboard"   element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/assessment"  element={<RequireAuth><AssessmentPage /></RequireAuth>} />
        <Route path="/passages"                  element={<RequireAuth><PassagePage /></RequireAuth>} />
        <Route path="/passages/add-assessment-1"      element={<RequireAuth><AddAssessment1Page /></RequireAuth>} />
        <Route path="/passages/add-assessment-2"      element={<RequireAuth><AddAssessment2Page /></RequireAuth>} />
        <Route path="/passages/edit-assessment-1/:id" element={<RequireAuth><EditAssessment1Page /></RequireAuth>} />
        <Route path="/passages/edit-assessment-2/:id" element={<RequireAuth><EditAssessment2Page /></RequireAuth>} />
        <Route path="/students"              element={<RequireAuth><StudentRecordPage /></RequireAuth>} />
        <Route path="/students/add"          element={<RequireAuth><AddStudentPage /></RequireAuth>} />
        <Route path="/students/class"        element={<RequireAuth><ClassRecordPage /></RequireAuth>} />
        <Route path="/students/:id"          element={<RequireAuth><StudentInfoPage /></RequireAuth>} />
        {/* <Route path="/asr-test"     element={<RequireAuth><ASRTestPage /></RequireAuth>} /> */}

      </Routes>
    </BrowserRouter>
  );
}
