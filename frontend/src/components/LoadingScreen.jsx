export default function LoadingScreen({ message = "Processing audio…" }) {
  return (
    <div className="asp-loading-screen">
      <div className="asp-loading-spinner" />
      <p className="asp-loading-message">{message}</p>
    </div>
  );
}
