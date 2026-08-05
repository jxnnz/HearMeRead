import "./component css/AssessmentStudentTopStrip.css";

export default function AssessmentStudentTopStrip({
  firstName,
  lastName,
  middleName,
  lrn,
}) {
  return (
    <div className="astop">
      <div className="astop__left">
        <span className="astop__label">Name:</span>
        <span className="astop__value">
          {lastName}, {firstName}{middleName ? `, ${middleName}` : ""}
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

