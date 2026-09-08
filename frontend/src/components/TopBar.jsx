import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CircleUserRound, LogOut } from "lucide-react";
import { authApi } from "../services/api";
import ConfirmModal from "../modals/ConfirmModal";
import "./component css/TopBar.css";

function getInitials(first, last) {
  const f = first ? first.charAt(0).toUpperCase() : "";
  const l = last ? last.charAt(0).toUpperCase() : "";
  return f + l || "U";
}

export default function TopBar({ title, children, hideAvatar = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef(null);

  const isDashboard = title === "Dashboard";
  const isProfilePage = title === "My Profile" || location.pathname === "/profile" || hideAvatar;

  useEffect(() => {
    authApi.me()
      .then((data) => {
        setUser(data);
      })
      .catch(() => {});
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const roleLabel = localStorage.getItem("role") === "ADMIN" ? "Admin" : "Teacher";
  const firstName = user ? user.first_name : "";

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  }

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

        {!isProfilePage && (
          <div className="topbar__profile-container" ref={dropdownRef}>
            <button
              type="button"
              className="topbar__avatar-btn"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="User Profile Menu"
              title={user ? `${user.first_name} ${user.last_name}` : "Profile Menu"}
            >
              {user?.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt="Profile"
                  className="topbar__avatar-img"
                />
              ) : (
                <span className="topbar__avatar-initials">
                  {user ? getInitials(user.first_name, user.last_name) : "U"}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="topbar__dropdown">
                {user && (
                  <div className="topbar__dropdown-header">
                    <span className="topbar__dropdown-name">
                      {user.first_name} {user.last_name}
                    </span>
                    <span className="topbar__dropdown-role">{roleLabel}</span>
                  </div>
                )}
                <div className="topbar__dropdown-divider" />
                <button
                  type="button"
                  className="topbar__dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/profile");
                  }}
                >
                  <CircleUserRound size={16} />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  className="topbar__dropdown-item topbar__dropdown-item--danger"
                  onClick={() => {
                    setDropdownOpen(false);
                    setShowLogoutModal(true);
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        variant="logout"
        title="Sign Out?"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
      />
    </div>
  );
}
