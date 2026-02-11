const logger = require('../config/logger');
const SystemLog = require('../models/SystemLog');

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_FAILED');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class MLProcessingError extends AppError {
  constructor(message = 'ML processing failed') {
    super(message, 500, 'ML_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service = 'unknown') {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * Log error to SystemLog collection
 */
const logErrorToDatabase = async (error, req, userId = null) => {
  try {
    const logLevel = error.statusCode >= 500 ? 'error' : 'warning';
    const component = req.path.split('/')[2] || 'api';

    await SystemLog.create({
      level: error.statusCode >= 500 ? 'critical' : logLevel,
      component,
      message: error.message,
      details: {
        code: error.code,
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        stack: error.stack,
        ...(error.details && { validationDetails: error.details }),
        ...(error.service && { service: error.service }),
      },
      userId,
    });
  } catch (dbError) {
    // If database logging fails, log to Winston only
    logger.error('Failed to log error to database:', {
      originalError: error.message,
      dbError: dbError.message,
    });
  }
};

/**
 * Centralized error handler middleware
 */
const errorHandler = async (err, req, res, next) => {
  // Default error values
  let error = err;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = new ValidationError('Validation failed', messages);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = new ConflictError(`${field} already exists`);
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    error = new ValidationError(`Invalid ${err.path}: ${err.value}`);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Handle Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ValidationError('File size exceeds maximum limit of 50MB');
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error = new ValidationError('Too many files uploaded');
    } else {
      error = new ValidationError(`File upload error: ${err.message}`);
    }
  }

  // Set default values if not an AppError
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.isOperational 
    ? error.message 
    : 'An unexpected error occurred';

  // Extract userId from request if available
  const userId = req.user?.userId || null;

  // Log error to Winston
  logger.error('Error occurred:', {
    code,
    message: error.message,
    statusCode,
    path: req.path,
    method: req.method,
    userId,
    ip: req.ip,
    stack: error.stack,
  });

  // Log error to database (async, don't wait)
  logErrorToDatabase(error, req, userId).catch(dbErr => {
    logger.error('Database logging failed:', dbErr);
  });

  // Send error response
  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        originalError: err.message,
      }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  MLProcessingError,
  DatabaseError,
  ExternalServiceError,
  
  // Middleware
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
