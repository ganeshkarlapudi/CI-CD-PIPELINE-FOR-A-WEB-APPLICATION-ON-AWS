const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'aircraft-detection-api' },
  transports: [
    // Error logs - only errors
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined logs - all levels
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Warning logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'warnings.log'), 
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      customFormat
    ),
  }));
}

// Add console transport for production with JSON format
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.json(),
  }));
}

// Helper methods for structured logging
logger.logRequest = (req, message = 'Request received') => {
  logger.info(message, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.userId,
    userAgent: req.get('user-agent'),
  });
};

logger.logResponse = (req, res, duration) => {
  logger.info('Request completed', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userId: req.user?.userId,
  });
};

logger.logError = (error, req = null, additionalInfo = {}) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...additionalInfo,
  };
  
  if (req) {
    errorLog.method = req.method;
    errorLog.path = req.path;
    errorLog.ip = req.ip;
    errorLog.userId = req.user?.userId;
  }
  
  logger.error('Error occurred', errorLog);
};

module.exports = logger;
