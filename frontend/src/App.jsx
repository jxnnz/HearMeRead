import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage      from "./pages/LandingPage";
import LoginPage        from "./pages/LoginPage";
import SignupPage       from "./pages/SignupPage";
import DashboardPage    from "./pages/DashboardPage";
import PassagePage      from "./pages/passages/PassagePage";
import AddAssessment1Page from "./pages/passages/AddAssessment1Page";
import AddAssessment2Page from "./pages/passages/AddAssessment2Page";
import StudentRecordPage from "./pages/StudentRecordPage";
import AddStudentPage   from "./pages/AddStudentPage";
import ASRTestPage      from "./pages/ASRTestPage";
import AssessmentPage   from "./pages/Assessment/AssessmentPage";
import StudentInfoPage  from "./pages/StudentInfoPage";


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
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"  element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/signup" element={<RequireGuest><SignupPage /></RequireGuest>} />

        {/* ── Protected ── */}
        <Route path="/dashboard"   element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/assessment"  element={<RequireAuth><AssessmentPage /></RequireAuth>} />
        <Route path="/passages"                  element={<RequireAuth><PassagePage /></RequireAuth>} />
        <Route path="/passages/add-assessment-1" element={<RequireAuth><AddAssessment1Page /></RequireAuth>} />
        <Route path="/passages/add-assessment-2" element={<RequireAuth><AddAssessment2Page /></RequireAuth>} />
        <Route path="/students"     element={<RequireAuth><StudentRecordPage /></RequireAuth>} />
        <Route path="/students/add" element={<RequireAuth><AddStudentPage /></RequireAuth>} />
        <Route path="/students/:id" element={<RequireAuth><StudentInfoPage /></RequireAuth>} />
        <Route path="/asr-test"     element={<RequireAuth><ASRTestPage /></RequireAuth>} />

      </Routes>
    </BrowserRouter>
  );
}
