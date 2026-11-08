// =====================================================================
// errorHandler.js: Centralized Application & MySQL Error Handler
// =====================================================================

function errorHandler(err, req, res, next) {
  console.error('[Error] Global caught:', err);

  // MySQL specific errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          success: false,
          error: 'Duplicate Entry',
          message: 'A record with the specified unique values (e.g. username, email, code) already exists.'
        });

      case 'ER_NO_REFERENCED_ROW_2':
      case 'ER_NO_REFERENCED_ROW':
        return res.status(400).json({
          success: false,
          error: 'Foreign Key Constraint Failed',
          message: 'Referenced entity does not exist in the database.'
        });

      case 'ER_ROW_IS_REFERENCED_2':
        return res.status(409).json({
          success: false,
          error: 'Dependency Constraint',
          message: 'Cannot delete or modify record because other records depend on it.'
        });

      case 'ER_CHECK_CONSTRAINT_VIOLATED':
        return res.status(400).json({
          success: false,
          error: 'Check Constraint Violated',
          message: err.sqlMessage || 'Supplied data violates database integrity check constraint.'
        });

      case 'ER_SIGNAL_EXCEPTION':
        // Trigger or stored procedure SIGNAL SQLSTATE '45000'
        return res.status(400).json({
          success: false,
          error: 'Database Trigger Integrity Check Failed',
          message: err.sqlMessage || 'Operation rejected by database business logic trigger.'
        });
    }
  }

  // Handle SQLSTATE 45000 triggers
  if (err.sqlState === '45000') {
    return res.status(400).json({
      success: false,
      error: 'Database Business Rule Error',
      message: err.sqlMessage || 'Operation was aborted by a database trigger or procedure rule.'
    });
  }

  // HTTP status errors
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred';

  res.status(status).json({
    success: false,
    error: err.name || 'InternalServerError',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;

