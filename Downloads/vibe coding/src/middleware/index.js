// Export all middleware for easy importing
const { authenticate, authorize } = require('./auth');
const {
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
} = require('./validation');
const {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  MLProcessingError,
  DatabaseError,
  ExternalServiceError,
} = require('./errorHandler');
const {
  requestLogger,
  requestTimer,
  requestId,
  detailedRequestLogger,
  errorRequestLogger,
} = require('./requestLogger');
const {
  apiLimiter,
  authLimiter,
  sanitizeInput,
  getCorsOptions,
  getHelmetOptions,
} = require('./security');
const {
  validateUploadedFiles,
  validateFileMagicNumber,
  validateImageDimensions,
  validateFileSize,
} = require('./fileValidation');

module.exports = {
  // Auth middleware
  authenticate,
  authorize,
  
  // Validation middleware
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
  
  // Security middleware
  apiLimiter,
  authLimiter,
  sanitizeInput,
  getCorsOptions,
  getHelmetOptions,
  
  // File validation middleware
  validateUploadedFiles,
  validateFileMagicNumber,
  validateImageDimensions,
  validateFileSize,
  
  // Error handling middleware
  errorHandler,
  asyncHandler,
  notFoundHandler,
  
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
  
  // Request logging middleware
  requestLogger,
  requestTimer,
  requestId,
  detailedRequestLogger,
  errorRequestLogger,
};
