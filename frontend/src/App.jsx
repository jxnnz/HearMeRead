import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from './pages/LoginPage';
import PassagesPage from "./pages/PassagesPage";

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Placeholder({ label }) {
  return <div style={{ padding: 40 }}><h2>{label}</h2><p>Coming soon.</p></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<RequireAuth><Placeholder label="Dashboard" /></RequireAuth>} />
        <Route path="/assessment" element={<RequireAuth><Placeholder label="Assessment" /></RequireAuth>} />

        <Route path="/passages" element={<PassagesPage />} />
        <Route path="/students" element={<RequireAuth><Placeholder label="Student Records" /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}