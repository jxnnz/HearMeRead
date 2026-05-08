/**
 * Extract a user-friendly error message from an Axios error.
 *
 * Priority:
 *  1. Known status-code overrides (429, 413, 5xx)
 *  2. Backend `detail` string (already user-friendly from FastAPI)
 *  3. Backend `detail` array (Pydantic validation errors — join the messages)
 *  4. The provided fallback
 *
 * We deliberately never surface axios's own `err.message` (e.g.
 * "Request failed with status code 422") because it leaks implementation
 * details that mean nothing to the teacher using the app.
 */
export function parseApiError(err, fallback = "Something went wrong. Please try again.") {
  if (!err?.response) {
    return "Unable to connect. Please check your internet connection and try again.";
  }

  const { status, data } = err.response;

  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status === 413) return "The file is too large. Please choose a smaller file.";
  if (status >= 500) return "A server error occurred. Please try again later.";

  const detail = data?.detail;
  if (typeof detail === "string" && detail.length > 0) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const msgs = detail.map((d) => d.msg || String(d)).filter(Boolean);
    if (msgs.length > 0) return msgs.join(". ");
  }

  return fallback;
}
