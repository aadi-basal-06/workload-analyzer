// =====================================================================
// studentRoutes.js: Student Operations, Tasks, & Workload Routes
// =====================================================================

const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const studentService = require('../services/studentService');

const router = express.Router();

// Enforce student role for all endpoints in this router
router.use(authenticateJWT, authorizeRoles('student'));

/**
 * GET /api/student/profile
 */
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await studentService.getStudentProfile(req.user.student_id);
    res.status(200).json({
      success: true,
      data: profile,
      message: 'Student profile retrieved'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/student/profile
 */
router.put('/profile', async (req, res, next) => {
  try {
    const updated = await studentService.updateStudentProfile(req.user.student_id, req.body);
    res.status(200).json({
      success: true,
      data: updated,
      message: 'Student profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/student/availability
 */
router.get('/availability', async (req, res, next) => {
  try {
    const slots = await studentService.getAvailability(req.user.student_id);
    res.status(200).json({
      success: true,
      data: slots,
      message: 'Availability slots retrieved'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/student/availability
 */
router.post(
  '/availability',
  [
    body('start_datetime').notEmpty().withMessage('start_datetime is required'),
    body('end_datetime').notEmpty().withMessage('end_datetime is required'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const slot = await studentService.createAvailability(req.user.student_id, req.body);
      res.status(201).json({
        success: true,
        data: slot,
        message: 'Availability block added successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/student/availability/:id
 */
router.put(
  '/availability/:id',
  [
    param('id').isInt().withMessage('Availability ID must be an integer'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const updated = await studentService.updateAvailability(
        req.user.student_id,
        req.params.id,
        req.body
      );
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Availability block updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/student/availability/:id
 */
router.delete(
  '/availability/:id',
  [
    param('id').isInt().withMessage('Availability ID must be an integer'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const result = await studentService.deleteAvailability(req.user.student_id, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Availability block deleted'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/student/tasks
 */
router.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await studentService.getStudentTasks(req.user.student_id);
    res.status(200).json({
      success: true,
      data: tasks,
      message: 'Assigned tasks retrieved'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/student/tasks/:id/progress
 */
router.patch(
  '/tasks/:id/progress',
  [
    param('id').isInt().withMessage('Task ID must be an integer'),
    body('completion_percentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Completion percentage must be between 0 and 100'),
    body('actual_hours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Actual hours must be a positive number'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const updated = await studentService.updateTaskProgress(
        req.user.student_id,
        req.params.id,
        req.body
      );
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Task progress updated'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/student/tasks/:id/submit
 */
router.post(
  '/tasks/:id/submit',
  [
    param('id').isInt().withMessage('Task ID must be an integer'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const submitted = await studentService.submitTask(
        req.user.student_id,
        req.params.id,
        req.body
      );
      res.status(200).json({
        success: true,
        data: submitted,
        message: 'Task successfully submitted'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/student/workload & GET /api/student/workload/current (alias)
 */
const handleGetWorkload = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const workload = await studentService.getWorkloadAnalysis(
      req.user.student_id,
      start_date,
      end_date
    );
    res.status(200).json({
      success: true,
      data: workload,
      message: 'Workload analysis calculated'
    });
  } catch (error) {
    next(error);
  }
};

router.get('/workload', handleGetWorkload);
router.get('/workload/current', handleGetWorkload);

/**
 * POST /api/student/workload/calculate
 */
router.post('/workload/calculate', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.body || {};
    const workload = await studentService.getWorkloadAnalysis(
      req.user.student_id,
      start_date,
      end_date
    );
    res.status(200).json({
      success: true,
      data: workload,
      message: 'Workload analysis recalculated'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/student/collisions
 */
router.get('/collisions', async (req, res, next) => {
  try {
    const collisions = await studentService.getCollisions(req.user.student_id);
    res.status(200).json({
      success: true,
      data: collisions,
      message: 'Detected collisions retrieved'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/student/collisions/:id/resolve
 */
router.patch(
  '/collisions/:id/resolve',
  [
    param('id').isInt().withMessage('Collision ID must be an integer'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const resolved = await studentService.resolveCollision(
        req.user.student_id,
        req.params.id
      );
      res.status(200).json({
        success: true,
        data: resolved,
        message: 'Collision marked as resolved'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

