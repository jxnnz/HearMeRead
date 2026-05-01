import "./LoadingPage.css";

export default function LoadingPage() {
  return (
    <div className="lp-bg">
      <div className="lp-content">
        <h1 className="lp-title">HearMeRead</h1>
        <p className="lp-sub">Reading Assessment Tool</p>
        <div className="lp-spinner" />
      </div>
    </div>
  );
}
