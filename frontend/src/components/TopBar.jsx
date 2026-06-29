import { useState, useEffect } from "react";
import { authApi } from "../services/api";
import "./component css/TopBar.css";

export default function TopBar({ title, children }) {
  const [user, setUser] = useState(null);
  const isDashboard = title === "Dashboard";

  useEffect(() => {
    if (isDashboard) {
      authApi.me()
        .then((data) => {
          setUser(data);
        })
        .catch(() => {});
    }
  }, [isDashboard]);

  const roleLabel = localStorage.getItem("role") === "ADMIN" ? "Admin" : "Teacher";
  const firstName = user ? user.first_name : "";

  return (
    <div className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__right">
        {isDashboard && firstName && (
          <span className="topbar__user-name">
            {roleLabel} {firstName}
          </span>
        )}
        {children && <div className="topbar__actions">{children}</div>}
      </div>
    </div>
  );
}
