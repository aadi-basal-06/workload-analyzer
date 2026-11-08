// =====================================================================
// validate.js: Express-Validator Error Handling Middleware
// =====================================================================

const { validationResult } = require('express-validator');

/**
 * Checks for express-validator errors and returns standard response
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: formatted[0].message,
      details: formatted
    });
  }
  next();
}

module.exports = {
  handleValidationErrors
};

