import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  UserRound,
  LogOut,
  Users,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import HmrLogo from "../assets/HMR-LOGO.png";
import ConfirmModal from "../modals/ConfirmModal";
import "./component css/Sidebar.css";

const TEACHER_NAV = [
  { to: "/dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { to: "/assessment", label: "Assessment",     icon: ClipboardList   },
  { to: "/passages",   label: "Passages",       icon: BookOpen        },
  { to: "/students",   label: "Student Record", icon: UserRound       },
];

const ADMIN_NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/teachers",  label: "Teachers",  icon: Users           },
  { to: "/admin/students",  label: "Students",  icon: GraduationCap   },
];

export default function Sidebar() {
  const navigate     = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [collapsed, setCollapsed]   = useState(true);
  const sidebarRef   = useRef(null);

  const isAdmin  = localStorage.getItem("role") === "ADMIN";
  const navItems = isAdmin ? ADMIN_NAV : TEACHER_NAV;

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (showLogout) return;
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setCollapsed(true);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLogout]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}
        onMouseEnter={() => setCollapsed(false)}
      >

        {/* Logo */}
        <div className="sidebar__header">
          <div className="sidebar__logo-box">
            <img src={HmrLogo} alt="HMR" className="sidebar__logo-img" />
            <span className="sidebar__logo-text">HearMeRead</span>
          </div>
        </div>

        {/* Admin badge */}
        {isAdmin && (
          <div className="sidebar__role-badge">
            <ShieldCheck size={13} className="sidebar__icon" />
            <span className="sidebar__label">Admin</span>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar__nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `sidebar__link${isActive ? " sidebar__link--active" : ""}`
              }
            >
              <Icon size={18} className="sidebar__icon" />
              <span className="sidebar__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          className="sidebar__logout"
          onClick={() => setShowLogout(true)}
          title="Log out"
        >
          <LogOut size={16} className="sidebar__icon" />
          <span className="sidebar__label">Log out</span>
        </button>

      </aside>

      <ConfirmModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        variant="logout"
        title="Sign Out?"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
      />
    </>
  );
}
