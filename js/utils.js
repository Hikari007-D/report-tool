/**
 * Utility Functions
 * Helper functions for validation, formatting, and common operations
 */

/**
 * Validate Work BOM format
 * Note: Validation disabled - accepts any format
 * @param {string} value - The Work BOM value to validate
 * @returns {boolean} - Always returns true
 */
export function validateWorkBom(value) {
  // No validation - accept any format
  return true;
}

/**
 * Validate project name
 * @param {string} value - Project name
 * @returns {boolean} - True if valid
 */
export function validateProjectName(value) {
  if (!value || value.trim() === "") return true; // Optional field

  const trimmed = value.trim();
  return trimmed.length >= 3 && trimmed.length <= 200;
}

/**
 * Escape HTML entities
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeHTML(str) {
  if (!str) return "";

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Format date to Thai locale (long form, e.g., "20 พฤษภาคม 2569")
 */
export function formatDateThai(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    date = new Date();
  }

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// kept for backward compatibility (legacy callers)
export const formatDate = formatDateThai;

/**
 * Format Date → ISO yyyy-mm-dd (for <input type="date">)
 */
export function formatDateISO(date) {
  if (!(date instanceof Date) || isNaN(date)) date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse yyyy-mm-dd → Date (returns null if invalid)
 */
export function parseISODate(s) {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}

/**
 * Get current timestamp in Thai format
 * @returns {string} - Formatted timestamp
 */
export function formatTimestamp() {
  const now = new Date();
  return now.toLocaleString("th-TH");
}

/**
 * Copy text to clipboard with fallback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  try {
    // Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    textArea.remove();

    return successful;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Check if localStorage is available and has space
 * @returns {boolean} - True if localStorage is available
 */
export function checkLocalStorageAvailable() {
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get localStorage quota usage (approximate)
 * @returns {Object} - {used, total, available}
 */
export function getStorageQuota() {
  let used = 0;

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  // Most browsers: ~5-10MB, we'll use 5MB as conservative estimate
  const total = 5 * 1024 * 1024; // 5MB in bytes

  return {
    used,
    total,
    available: total - used,
    percentUsed: Math.round((used / total) * 100),
  };
}

/**
 * Show validation error message
 * @param {HTMLElement} element - Input element
 * @param {string} message - Error message
 */
export function showValidationError(element, message) {
  element.classList.add("invalid");

  let errorDiv = element.nextElementSibling;
  if (!errorDiv || !errorDiv.classList.contains("error-message")) {
    errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    element.parentNode.insertBefore(errorDiv, element.nextSibling);
  }

  errorDiv.textContent = message;
  errorDiv.classList.add("visible");

  // Set ARIA attributes for accessibility
  element.setAttribute("aria-invalid", "true");
  element.setAttribute(
    "aria-describedby",
    errorDiv.id || "error-" + element.id,
  );
}

/**
 * Clear validation error message
 * @param {HTMLElement} element - Input element
 */
export function clearValidationError(element) {
  element.classList.remove("invalid");
  element.removeAttribute("aria-invalid");
  element.removeAttribute("aria-describedby");

  const errorDiv = element.nextElementSibling;
  if (errorDiv && errorDiv.classList.contains("error-message")) {
    errorDiv.classList.remove("visible");
  }
}
