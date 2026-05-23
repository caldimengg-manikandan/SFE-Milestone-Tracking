/**
 * Formats a Date object or ISO date string to MM-DD-YYYY.
 * @param {Date|string} dateInput - Date object or parsable date string.
 * @returns {string} Formatted date string.
 */
export function formatDateMMDDYYYY(dateInput) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date)) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}
