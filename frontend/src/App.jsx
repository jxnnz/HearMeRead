import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from './pages/LoginPage';
import SignupPage from "./pages/SignupPage";
import PassagesPage from "./pages/PassagesPage";
import AddPassagePage from "./pages/AddPassagePage";
import StudentRecordPage from "./pages/StudentRecordPage";
import AddStudentPage from "./pages/AddStudentPage";
import AssessmentPage from "./pages/AssessmentPage";
import StudentInfoPage from "./pages/StudentInfoPage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage   from "./pages/LandingPage";

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<LandingPage />} />
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/signup"  element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />}/>
        <Route path="/assessment" element={<AssessmentPage />} />

        <Route path="/passages"      element={<PassagesPage />} />
        <Route path="/passages/add"  element={<AddPassagePage />} />
        <Route path="/students"      element={<StudentRecordPage />} />
        <Route path="/students/add"  element={<AddStudentPage />} />
        <Route path="/students/:id"  element={<StudentInfoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}