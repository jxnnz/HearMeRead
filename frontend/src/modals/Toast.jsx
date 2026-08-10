import "./Toast.css";

export default function Toast({ toasts = [] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-item--${t.type ?? "success"}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
