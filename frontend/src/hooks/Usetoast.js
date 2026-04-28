import { useState, useCallback } from "react";

let _nextId = 1;

/**
 * useToast — lightweight toast state manager
 *
 * Returns:
 *   toasts   : current toast array (pass to <Toast />)
 *   addToast : ({ type, title, message, duration? }) => void
 *   removeToast : (id) => void
 *
 * Preset helpers (call without arguments for default copy):
 *   showLoginSuccess()
 *   showSaveSuccess(label?)
 *   showSessionExpired()
 */
export default function useToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = "info", title, message, duration }) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  }, []);

  // ── Preset helpers ────────────────────────────────────────────────────────

  /** Show after successful login */
  const showLoginSuccess = useCallback((name = "") => {
    addToast({
      type: "success",
      title: name ? `Welcome back, ${name}!` : "Login successful",
      message: "You are now signed in to your account.",
      duration: 4000,
    });
  }, [addToast]);

  /** Show after a successful save action */
  const showSaveSuccess = useCallback((label = "Changes") => {
    addToast({
      type: "success",
      title: `${label} saved`,
      message: "Your changes have been saved successfully.",
      duration: 4000,
    });
  }, [addToast]);

  /** Show when the session expires — sticky (no auto-dismiss) */
  const showSessionExpired = useCallback(() => {
    addToast({
      type: "warning",
      title: "Session expired",
      message: "Your session has timed out. Please log in again to continue.",
      duration: 0, // sticky — user must dismiss or re-login
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showLoginSuccess,
    showSaveSuccess,
    showSessionExpired,
  };
}