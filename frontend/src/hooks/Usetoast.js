import { useState, useCallback } from "react";

export default function useToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000
    );
  }, []);

  const showSaveSuccess = useCallback(
    (label = "Changes") => addToast(`${label} saved successfully!`),
    [addToast]
  );

  const showError = useCallback(
    (message = "Something went wrong. Please try again.") => addToast(message, "error"),
    [addToast]
  );

  return { toasts, removeToast, showSaveSuccess, showError };
}
