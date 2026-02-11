const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation middleware to check for errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

// Registration validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .escape(), // XSS protection
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  
  validate,
];

// Login validation rules
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ max: 30 })
    .withMessage('Username must not exceed 30 characters')
    .escape(), // XSS protection
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password must not exceed 128 characters'),
  
  validate,
];

// MongoDB ObjectId validation
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ID format'),
  validate,
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  validate,
];

// Date range validation
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.startDate && value < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  validate,
];

// Defect class validation
const defectClassValidation = [
  query('defectClass')
    .optional()
    .isIn([
      'damaged_rivet',
      'missing_rivet',
      'filiform_corrosion',
      'missing_panel',
      'paint_detachment',
      'scratch',
      'composite_damage',
      'random_damage',
      'burn_mark',
      'scorch_mark',
      'metal_fatigue',
      'crack',
    ])
    .withMessage('Invalid defect class'),
  
  validate,
];

// Inspection status validation
const statusValidation = [
  query('status')
    .optional()
    .isIn(['uploaded', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status value'),
  
  validate,
];

// User creation/update validation (admin)
const userManagementValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .escape(),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters'),
  
  body('password')
    .optional()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'),
  
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either "active" or "inactive"'),
  
  validate,
];

// Report format validation
const reportFormatValidation = [
  query('format')
    .optional()
    .isIn(['json', 'pdf'])
    .withMessage('Format must be either "json" or "pdf"'),
  
  validate,
];

// Search query validation
const searchValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters')
    .escape(), // XSS protection
  
  validate,
];

// Aircraft ID validation
const aircraftIdValidation = [
  body('aircraftId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Aircraft ID must not exceed 50 characters')
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Aircraft ID can only contain letters, numbers, hyphens, and underscores')
    .escape(),
  
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  validateObjectId,
  paginationValidation,
  dateRangeValidation,
  defectClassValidation,
  statusValidation,
  userManagementValidation,
  reportFormatValidation,
  searchValidation,
  aircraftIdValidation,
};
