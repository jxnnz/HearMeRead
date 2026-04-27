// ============================================================
// HearMeRead — AppButton Component
// Reusable button with variants:
//   variant: "primary" | "outline" | "ghost" | "danger"
//   size:    "sm" | "md" (default) | "lg"
//
// Usage:
//   <AppButton variant="primary" onClick={...}>+ Add Student</AppButton>
//   <AppButton variant="outline" size="sm" onClick={...}>Cancel</AppButton>
// ============================================================
import "./component css/AppButton.css";

export default function AppButton({
  children,
  variant = "outline",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  fullWidth = false,
  className = "",
  ...rest
}) {
  const classes = [
    "app-btn",
    `app-btn--${variant}`,
    `app-btn--${size}`,
    fullWidth ? "app-btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}