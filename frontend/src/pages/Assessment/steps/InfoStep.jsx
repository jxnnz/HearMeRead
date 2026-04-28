import { ChevronRight } from "lucide-react";
import StudentInfoForm from "../../../components/StudentInfoForm";
import RecordingChoiceModal from "../../../modals/RecordingChoiceModal";

export default function InfoStep({
  form, setForm,
  students, allPassages,
  loadingStudents, loadingPassages,
  fetchError, createError,
  creating, onContinue,
  fileInput, choiceModalProps,
}) {
  return (
    <>
      {fileInput}
      <div className="asp-page asp-page--step1">
        <h1 className="asp-title">Assessment Session</h1>
        {fetchError && <div className="asp-error">⚠ {fetchError}</div>}

        <StudentInfoForm
          form={form}
          setForm={setForm}
          students={students}
          passages={allPassages}
          loadingStudents={loadingStudents}
          loadingPassages={loadingPassages}
        />

        {createError && <div className="asp-error">{createError}</div>}

        <button
          className="asp-continue-btn"
          onClick={onContinue}
          disabled={creating || !form.student_id}
        >
          {creating ? "Creating session…" : "Continue"}
          {!creating && <ChevronRight size={16} />}
        </button>
      </div>
      <RecordingChoiceModal {...choiceModalProps} />
    </>
  );
}
