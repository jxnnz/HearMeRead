import "./component css/Auth.css";
import PublicNav from "./PublicNav";

export default function AuthLayout({ children, page }) {
  return (
    <div className="auth-bg">

      <PublicNav page={page} />

      {/* Card */}
      <div className="auth-card-wrap">
        <div className={`auth-card${page === "login" ? " auth-card--login" : ""}`}>
          {children}
        </div>
      </div>

    </div>
  );
}
