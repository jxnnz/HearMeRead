import { ChevronRight } from "lucide-react";
import StudentInfoForm from "../../components/StudentInfoForm";
import RecordingChoiceModal from "../../modals/RecordingChoiceModal";

export default function InfoStep({
  form, setForm,
  availableGrades,
  students, allPassages,
  loadingStudents, loadingPassages,
  fetchError, createError,
  creating, session, onContinue,
  fileInput, choiceModalProps,
}) {
  const sessionStarted = !!session;
  return (
    <>
      {fileInput}
      <div className="asp-page asp-page--step1">
        <h1 className="asp-title">Assessment Session</h1>
        {fetchError && <div className="asp-error">⚠ {fetchError}</div>}

        <StudentInfoForm
          form={form}
          setForm={setForm}
          availableGrades={availableGrades}
          students={students}
          passages={allPassages}
          loadingStudents={loadingStudents}
          loadingPassages={loadingPassages}
        />

        {createError && <div className="asp-error">{createError}</div>}

        <button
          className="asp-continue-btn"
          onClick={onContinue}
          disabled={creating || !form.student_id || sessionStarted}
        >
          {creating
            ? "Creating session…"
            : sessionStarted
              ? "Session already started"
              : "Continue"}
          {!creating && !sessionStarted && <ChevronRight size={16} />}
        </button>
      </div>
      <RecordingChoiceModal {...choiceModalProps} />
    </>
  );
}
