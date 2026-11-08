// =====================================================================
// facultyRoutes.js: Faculty Courses, Tasks, & Simulation Routes
// =====================================================================

const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const facultyService = require('../services/facultyService');

const router = express.Router();

// Enforce faculty or admin role for all endpoints
router.use(authenticateJWT, authorizeRoles('faculty', 'admin'));

/**
 * GET /api/faculty/courses
 */
router.get('/courses', async (req, res, next) => {
  try {
    const courses = await facultyService.getCourses(req.user.user_id);
    res.status(200).json({
      success: true,
      data: courses,
      message: 'Faculty courses retrieved'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/faculty/courses
 */
router.post(
  '/courses',
  [
    body('course_code').trim().notEmpty().withMessage('Course code is required'),
    body('course_name').trim().notEmpty().withMessage('Course name is required'),
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
    body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be an integer'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const course = await facultyService.createCourse(req.user.user_id, req.body);
      res.status(201).json({
        success: true,
        data: course,
        message: 'Course created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/faculty/courses/:id
 */
router.get(
  '/courses/:id',
  [param('id').isInt().withMessage('Course ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const course = await facultyService.getCourseById(req.user.user_id, req.params.id);
      res.status(200).json({
        success: true,
        data: course,
        message: 'Course retrieved'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/faculty/courses/:id
 */
router.put(
  '/courses/:id',
  [param('id').isInt().withMessage('Course ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const updated = await facultyService.updateCourse(req.user.user_id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Course updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/faculty/courses/:id
 */
router.delete(
  '/courses/:id',
  [param('id').isInt().withMessage('Course ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const result = await facultyService.deleteCourse(req.user.user_id, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course deleted'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/faculty/tasks
 */
router.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await facultyService.getTasks(req.user.user_id, req.query.course_id);
    res.status(200).json({
      success: true,
      data: tasks,
      message: 'Tasks retrieved'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/faculty/tasks
 */
router.post(
  '/tasks',
  [
    body('course_id').isInt().withMessage('Valid course_id is required'),
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('deadline_datetime').notEmpty().withMessage('deadline_datetime is required'),
    body('difficulty_level').optional().isInt({ min: 1, max: 5 }).withMessage('Difficulty level must be 1 to 5'),
    body('cognitive_load').optional().isInt({ min: 1, max: 10 }).withMessage('Cognitive load must be 1 to 10'),
    body('assessment_weight').optional().isFloat({ min: 0, max: 100 }).withMessage('Assessment weight must be between 0 and 100'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const task = await facultyService.createTask(req.user.user_id, req.body);
      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created and automatically assigned to semester cohort'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/faculty/tasks/:id
 */
router.get(
  '/tasks/:id',
  [param('id').isInt().withMessage('Task ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const task = await facultyService.getTaskById(req.user.user_id, req.params.id);
      res.status(200).json({
        success: true,
        data: task,
        message: 'Task details retrieved'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/faculty/tasks/:id
 */
router.put(
  '/tasks/:id',
  [param('id').isInt().withMessage('Task ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const updated = await facultyService.updateTask(req.user.user_id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Task updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/faculty/tasks/:id
 */
router.delete(
  '/tasks/:id',
  [param('id').isInt().withMessage('Task ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const result = await facultyService.deleteTask(req.user.user_id, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Task deleted'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/faculty/tasks/:id/dependencies
 */
router.post(
  '/tasks/:id/dependencies',
  [
    param('id').isInt().withMessage('Task ID must be an integer'),
    body('prerequisite_task_id').isInt().withMessage('prerequisite_task_id is required'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const dependency = await facultyService.addDependency(
        req.user.user_id,
        req.params.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data: dependency,
        message: 'Prerequisite dependency created'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/faculty/tasks/:id/dependencies/:prereqId
 */
router.delete(
  '/tasks/:id/dependencies/:prereqId',
  [
    param('id').isInt().withMessage('Task ID must be an integer'),
    param('prereqId').isInt().withMessage('Prerequisite ID must be an integer'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const result = await facultyService.deleteDependency(
        req.user.user_id,
        req.params.id,
        req.params.prereqId
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Dependency removed'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/faculty/tasks/:id/students
 */
router.get(
  '/tasks/:id/students',
  [param('id').isInt().withMessage('Task ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const students = await facultyService.getTaskStudents(req.user.user_id, req.params.id);
      res.status(200).json({
        success: true,
        data: students,
        message: 'Assigned students retrieved'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/faculty/simulations & POST /api/faculty/simulator/run (alias)
 */
const simulationValidators = [
  body('task_id').isInt().withMessage('Valid task_id is required'),
  body('proposed_deadline').notEmpty().withMessage('proposed_deadline is required'),
  handleValidationErrors
];

const handleRunSimulation = async (req, res, next) => {
  try {
    const simulation = await facultyService.runSimulation(req.user.user_id, req.body);
    res.status(201).json({
      success: true,
      data: simulation,
      message: 'Simulation executed successfully'
    });
  } catch (error) {
    next(error);
  }
};

router.post('/simulations', simulationValidators, handleRunSimulation);
router.post('/simulator/run', simulationValidators, handleRunSimulation);

/**
 * GET /api/faculty/simulations & GET /api/faculty/simulator/history (alias)
 */
const handleGetSimulations = async (req, res, next) => {
  try {
    const simulations = await facultyService.getSimulations(req.user.user_id);
    res.status(200).json({
      success: true,
      data: simulations,
      message: 'Simulation history retrieved'
    });
  } catch (error) {
    next(error);
  }
};

router.get('/simulations', handleGetSimulations);
router.get('/simulator/history', handleGetSimulations);

/**
 * GET /api/faculty/courses/:id/risk-summary
 */
router.get(
  '/courses/:id/risk-summary',
  [param('id').isInt().withMessage('Course ID must be an integer'), handleValidationErrors],
  async (req, res, next) => {
    try {
      const summary = await facultyService.getCourseRiskSummary(req.user.user_id, req.params.id);
      res.status(200).json({
        success: true,
        data: summary,
        message: 'Course risk summary retrieved'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

