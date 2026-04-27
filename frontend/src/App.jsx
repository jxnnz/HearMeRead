import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from './pages/LoginPage';
import SignupPage from "./pages/SignupPage";
import PassagesPage from "./pages/PassagesPage";
import AddPassagePage from "./pages/AddPassagePage";
import StudentRecordPage from "./pages/StudentRecordPage";
import AddStudentPage from "./pages/AddStudentPage";
import ASRTestPage from "./pages/ASRTestPage";
import AssessmentPage from "./pages/AssessmentPage";
import StudentInfoPage from "./pages/StudentInfoPage";

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireGuest({ children }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/assessment" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/signup"   element={<RequireGuest><SignupPage /></RequireGuest>} />

        <Route path="/assessment"   element={<RequireAuth><AssessmentPage /></RequireAuth>} />
        <Route path="/passages"     element={<RequireAuth><PassagesPage /></RequireAuth>} />
        <Route path="/passages/add" element={<RequireAuth><AddPassagePage /></RequireAuth>} />
        <Route path="/students"     element={<RequireAuth><StudentRecordPage /></RequireAuth>} />
        <Route path="/students/add" element={<RequireAuth><AddStudentPage /></RequireAuth>} />
        <Route path="/students/:id" element={<RequireAuth><StudentInfoPage /></RequireAuth>} />
        <Route path="/asr-test"     element={<RequireAuth><ASRTestPage /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}