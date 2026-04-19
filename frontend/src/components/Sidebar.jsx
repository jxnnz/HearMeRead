import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  UserRound,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assessment", label: "Assessment", icon: ClipboardList },
  { to: "/passages", label: "Passages", icon: BookOpen },
  { to: "/students", label: "Student Record", icon: UserRound },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      {/* Logo / brand area */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-box">
          <span className="sidebar__logo-text">HearMeRead</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
          >
            <Icon size={17} className="sidebar__icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button className="sidebar__logout" onClick={handleLogout}>
        <LogOut size={15} />
        <span>Log out</span>
      </button>
    </aside>
  );
}