// =====================================================================
// authRoutes.js: Authentication Endpoints
// =====================================================================

const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');
const authService = require('../services/authService');

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .isIn(['student', 'faculty', 'admin'])
      .withMessage('Role must be student, faculty, or admin'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const result = await authService.registerUser(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const result = await authService.loginUser(req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateJWT, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.user_id);
    res.status(200).json({
      success: true,
      data: user,
      message: 'Current profile retrieved'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

