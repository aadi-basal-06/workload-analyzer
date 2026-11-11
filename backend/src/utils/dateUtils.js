// =====================================================================
// dateUtils.js: Normalizes datetimes for MySQL DATETIME columns & procedures
// =====================================================================

/**
 * Normalizes any ISO 8601 string, Date object, or datetime string
 * into MySQL DATETIME format: 'YYYY-MM-DD HH:MM:SS'
 */
function formatMySqlDateTime(dateInput) {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      const err = new Error('Invalid datetime value');
      err.statusCode = 400;
      throw err;
    }
    return dateInput.toISOString().slice(0, 19).replace('T', ' ');
  }

  if (typeof dateInput === 'string') {
    let clean = dateInput.trim();
    if (!clean) return null;

    // Convert ISO string components (replace T with space, remove trailing Z, remove subsecond decimals)
    clean = clean.replace('T', ' ').replace(/Z$/i, '').replace(/\.\d+$/, '');

    // If format is YYYY-MM-DD HH:MM, append :00 seconds
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(clean)) {
      clean += ':00';
    }

    // Validate that the date is semantically valid
    const parsed = new Date(clean.replace(' ', 'T'));
    if (isNaN(parsed.getTime()) && isNaN(new Date(dateInput).getTime())) {
      const err = new Error(`Invalid datetime value: ${dateInput}`);
      err.statusCode = 400;
      throw err;
    }

    return clean;
  }

  return dateInput;
}

module.exports = {
  formatMySqlDateTime
};
