import { ChevronRight } from "lucide-react";
import StudentInfoForm from "../../components/StudentInfoForm";
import RecordingChoiceModal from "../../modals/RecordingChoiceModal";
import TopBar from "../../components/TopBar";

export default function InfoStep({
  form, setForm,
  availableGrades,
  students, allPassages,
  completedStudentIds,
  loadingStudents, loadingPassages,
  fetchError, createError,
  creating, session, onContinue,
  fileInput, choiceModalProps,
}) {
  const sessionStarted = !!session;
  return (
    <>
      {fileInput}
      <TopBar title="Assessment Session" />
      <div className="asp-page asp-page--step1">
        {fetchError && <div className="asp-error">⚠ {fetchError}</div>}

        <StudentInfoForm
          form={form}
          setForm={setForm}
          students={students}
          completedStudentIds={completedStudentIds}
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
