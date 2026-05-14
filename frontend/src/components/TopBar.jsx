import "./component css/TopBar.css";

export default function TopBar({ title, children }) {
  return (
    <div className="topbar">
      <h1 className="topbar__title">{title}</h1>
      {children && <div className="topbar__actions">{children}</div>}
    </div>
  );
}
