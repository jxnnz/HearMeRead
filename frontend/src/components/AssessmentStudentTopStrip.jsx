import "./component css/AssessmentStudentTopStrip.css";

export default function AssessmentStudentTopStrip({
  firstName,
  lastName,
  lrn,
}) {
  return (
    <div className="astop">
      <div className="astop__left">
        <span className="astop__label">Name:</span>
        <span className="astop__value">
          {firstName} {lastName}
        </span>
        <span className="astop__sep" aria-hidden>
          ·
        </span>
        <span className="astop__label">LRN:</span>
        <span className="astop__value">{lrn ?? "—"}</span>
      </div>
    </div>
  );
}

