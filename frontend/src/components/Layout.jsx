import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import ConfirmModal from "../modals/ConfirmModal";
import { authApi } from "../services/api";
import "./component css/Layout.css";

const EMP_PROMPT_KEY = "emp_id_prompted";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [showEmpModal, setShowEmpModal] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "teacher") return;
    if (sessionStorage.getItem(EMP_PROMPT_KEY)) return;

    sessionStorage.setItem(EMP_PROMPT_KEY, "1");
    authApi.me().then((data) => {
      if (!data.employee_id) setShowEmpModal(true);
    }).catch(() => {});
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout__main">{children}</main>

      <ConfirmModal
        isOpen={showEmpModal}
        onClose={() => setShowEmpModal(false)}
        onConfirm={() => { setShowEmpModal(false); navigate("/profile"); }}
        title="Set Your Employee ID"
        message="You haven't added your Employee ID yet. Please go to your profile to set it before using the system."
        confirmLabel="Go to Profile"
        cancelLabel="Later"
        variant="default"
      />
    </div>
  );
}
