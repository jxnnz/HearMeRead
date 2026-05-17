import { useState, useRef } from "react";
import { Camera, X, Loader } from "lucide-react";
import { authApi } from "../services/api";
import "./component css/TeacherProfileModal.css";

function getInitials(first, last) {
  const f = first ? first.charAt(0).toUpperCase() : "";
  const l = last ? last.charAt(0).toUpperCase() : "";
  return f + l;
}

export default function TeacherProfileModal({ user, onClose, onProfileUpdated }) {
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [employeeId, setEmployeeId] = useState(user?.employee_id || "");
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await authApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        employee_id: employeeId || null
      });
      onProfileUpdated(updatedUser);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
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
    try {
      // 1. Get presigned URL
      const { presigned_url, key } = await authApi.getProfilePictureUploadUrl(file.type);
      
      // 2. Upload directly to R2
      const uploadRes = await fetch(presigned_url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type
        }
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload image to Cloudflare R2.");

      // 3. Save the key in the database
      const updatedUser = await authApi.updateProfile({ profile_picture_url: key });
      onProfileUpdated(updatedUser);
    } catch (err) {
      setError(err.message || "Failed to upload picture.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const avatarContent = user?.profile_picture_url ? (
    <img src={user.profile_picture_url} alt="Profile" className="tpm-avatar-img" />
  ) : (
    <span className="tpm-avatar-initials">{getInitials(user?.first_name, user?.last_name)}</span>
  );

  return (
    <div className="tpm-overlay">
      <div className="tpm-modal">
        <button className="tpm-close" onClick={onClose}><X size={20} /></button>
        <h2 className="tpm-title">My Profile</h2>
        
        {error && <div className="tpm-error">{error}</div>}

        <div className="tpm-avatar-section">
          <div className="tpm-avatar-wrapper">
            {uploading ? (
              <div className="tpm-avatar-loading"><Loader className="spin" size={24} /></div>
            ) : (
              avatarContent
            )}
            <button 
              type="button" 
              className="tpm-avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera size={16} />
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

        <form onSubmit={handleSubmit} className="tpm-form">
          <div className="tpm-form-row">
            <div className="tpm-field">
              <label>First Name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="tpm-field">
              <label>Last Name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="tpm-field">
            <label>Employee ID</label>
            <input 
              type="text" 
              value={employeeId} 
              onChange={e => setEmployeeId(e.target.value)} 
              maxLength={7}
              placeholder="7-digit ID"
            />
          </div>

          <hr className="tpm-divider" />
          <h3 className="tpm-section-title">Assignment Information</h3>
          
          <div className="tpm-readonly-grid">
            <div className="tpm-readonly-item">
              <span className="tpm-ro-label">School ID</span>
              <span className="tpm-ro-value">{user?.deped_school_id || user?.school_code || "N/A"}</span>
            </div>
            <div className="tpm-readonly-item">
              <span className="tpm-ro-label">School Name</span>
              <span className="tpm-ro-value">{user?.school_name || "N/A"}</span>
            </div>
            <div className="tpm-readonly-item">
              <span className="tpm-ro-label">Grade Level</span>
              <span className="tpm-ro-value">{user?.grade_level ? user.grade_level.replace("_", " ").toUpperCase() : "Unassigned"}</span>
            </div>
            <div className="tpm-readonly-item">
              <span className="tpm-ro-label">Section</span>
              <span className="tpm-ro-value">{user?.section || "Unassigned"}</span>
            </div>
          </div>

          <div className="tpm-actions">
            <button type="submit" className="tpm-btn tpm-btn-primary" disabled={loading || uploading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
