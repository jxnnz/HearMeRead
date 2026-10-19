import { useState, useEffect } from "react";
import "./EditTranscriptionModal.css";

export default function EditTranscriptionModal({ isOpen, transcript, onSave, onClose }) {
  const [text, setText] = useState(transcript ?? "");

  useEffect(() => {
    if (isOpen) setText(transcript ?? "");
  }, [isOpen, transcript]);

  if (!isOpen) return null;

  function handleSave() {
    onSave(text);
    onClose();
  }

  return (
    <div className="etm-overlay" onClick={onClose}>
      <div className="etm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="etm-title">Edit Transcription</h3>
        <textarea
          className="etm-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          autoFocus
        />
        <div className="etm-actions">
          <button className="etm-btn etm-btn--cancel" onClick={onClose}>Cancel</button>
          <button className="etm-btn etm-btn--save" onClick={handleSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
