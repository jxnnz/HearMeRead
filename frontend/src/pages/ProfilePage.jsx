import { useState, useRef, useEffect } from "react";
import { Camera, Loader, Lock, LogOut, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";
import ConfirmModal from "../modals/ConfirmModal";
import "./pages css/ProfilePage.css";

function getInitials(first, last) {
  const f = first ? first.charAt(0).toUpperCase() : "";
  const l = last ? last.charAt(0).toUpperCase() : "";
  return f + l;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const fileInputRef = useRef(null);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  }

  useEffect(() => {
    authApi.me()
      .then((data) => {
        setUser(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmployeeId(data.employee_id || "");
      })
      .catch((err) => {
        setError("Failed to load profile.");
      })
      .finally(() => {
        setLoadingUser(false);
      });
  }, []);

  const isEmployeeIdLocked = Boolean(user?.employee_id);

  async function saveProfile() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedUser = await authApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        employee_id: employeeId || null,
      });
      setUser(updatedUser);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!isEmployeeIdLocked && employeeId) {
      setShowLockConfirm(true);
      return;
    }
    saveProfile();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedUser = await authApi.uploadProfilePicture(file);
      setUser(updatedUser);
      setSuccess("Profile picture updated successfully!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || err.message || "Failed to upload picture.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loadingUser) {
    return (
      <Layout>
        <div className="pp-page">
          <TopBar title="My Profile" />
          <div className="pp-content">
            <div className="pp-card">
              <div className="sk pp-skel-avatar" />
              <div className="pp-skel-row">
                <div className="pp-skel-field">
                  <div className="sk sk-h2" style={{ width: "45%" }} />
                  <div className="sk sk-row" />
                </div>
                <div className="pp-skel-field">
                  <div className="sk sk-h2" style={{ width: "45%" }} />
                  <div className="sk sk-row" />
                </div>
              </div>
              <div className="pp-skel-field" style={{ marginBottom: 16 }}>
                <div className="sk sk-h2" style={{ width: "35%" }} />
                <div className="sk sk-row" />
              </div>
              <div className="sk" style={{ height: 1, marginBottom: 14, background: "#e0e4f0", borderRadius: 0 }} />
              <div className="sk sk-h1" style={{ width: "45%", marginBottom: 14 }} />
              <div className="pp-readonly-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="sk sk-h2" style={{ width: "55%" }} />
                    <div className="sk sk-text" style={{ width: "70%" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const avatarContent = user?.profile_picture_url ? (
    <img src={user.profile_picture_url} alt="Profile" className="pp-avatar-img" />
  ) : (
    <span className="pp-avatar-initials">{getInitials(user?.first_name, user?.last_name)}</span>
  );

  return (
    <Layout>
      <div className="pp-page">
        <TopBar title="My Profile" />

        <div className="pp-content">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "580px", margin: "0 auto", paddingBottom: "40px" }}>
            <div className="pp-card">
              
              {error && <div className="pp-alert pp-alert--error">{error}</div>}
              {success && <div className="pp-alert pp-alert--success">{success}</div>}

              <div className="pp-avatar-section">
                <div className="pp-avatar-wrapper">
                  {uploading ? (
                    <div className="pp-avatar-loading"><Loader className="spin" size={32} /></div>
                  ) : (
                    avatarContent
                  )}
                  <button 
                    type="button" 
                    className="pp-avatar-edit-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera size={18} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="pp-form">
                <div className="pp-form-row">
                  <div className="pp-field">
                    <label>First Name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div className="pp-field">
                    <label>Last Name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="pp-field">
                  <label className="pp-field-label-row">
                    Employee ID
                    {isEmployeeIdLocked && <Lock size={11} className="pp-lock-icon" />}
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={e => !isEmployeeIdLocked && setEmployeeId(e.target.value)}
                    maxLength={7}
                    placeholder="7-digit ID"
                    readOnly={isEmployeeIdLocked}
                    className={isEmployeeIdLocked ? "pp-input-locked" : ""}
                  />
                </div>

                <hr className="pp-divider" />
                <h3 className="pp-section-title">Assignment Information</h3>
                
                <div className="pp-readonly-grid">
                  <div className="pp-readonly-item">
                    <span className="pp-ro-label">School ID</span>
                    <span className="pp-ro-value">{user?.deped_school_id || user?.school_code || "N/A"}</span>
                  </div>
                  <div className="pp-readonly-item">
                    <span className="pp-ro-label">School Name</span>
                    <span className="pp-ro-value">{user?.school_name || "N/A"}</span>
                  </div>
                  {user?.role !== "admin" && (
                    <>
                      <div className="pp-readonly-item">
                        <span className="pp-ro-label">Grade Level</span>
                        <span className="pp-ro-value">{user?.grade_level ? user.grade_level.replace("_", " ").toUpperCase() : "Unassigned"}</span>
                      </div>
                      <div className="pp-readonly-item">
                        <span className="pp-ro-label">Section</span>
                        <span className="pp-ro-value">{user?.section || "Unassigned"}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pp-actions">
                  <button type="submit" className="pp-btn pp-btn-primary" disabled={loading || uploading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>

              {/* Mobile-only logout button */}
              <button
                className="pp-mobile-logout"
                type="button"
                onClick={() => setShowLogout(true)}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>

            {/* User Manual Button */}
            <button
              type="button"
              className="pp-manual-btn"
              onClick={() => navigate("/manual")}
            >
              <BookOpen size={16} />
              User Manual
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={() => { setShowLockConfirm(false); saveProfile(); }}
        title="Employee ID Cannot Be Changed"
        message="Once saved, your Employee ID is permanent and cannot be edited. Please double-check that the ID is correct before confirming."
        confirmLabel="Yes, Save"
        cancelLabel="Go Back"
        variant="default"
      />
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
    </Layout>
  );
}
