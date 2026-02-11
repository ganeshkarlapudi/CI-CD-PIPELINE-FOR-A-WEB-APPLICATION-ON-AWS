const morgan = require('morgan');
const logger = require('../config/logger');

/**
 * Custom Morgan token for user ID
 */
morgan.token('user-id', (req) => {
  return req.user?.userId || 'anonymous';
});

/**
 * Custom Morgan token for request duration
 */
morgan.token('response-time-ms', (req, res) => {
  if (!req._requestStartTime) return '0';
  const diff = process.hrtime(req._requestStartTime);
  return ((diff[0] * 1e3) + (diff[1] * 1e-6)).toFixed(2);
});

/**
 * Custom Morgan format for detailed logging
 */
const detailedFormat = ':method :url :status :response-time-ms ms - :user-id - :remote-addr - :user-agent';

/**
 * Morgan middleware with Winston integration
 */
const requestLogger = morgan(detailedFormat, {
  stream: {
    write: (message) => {
      // Parse the message to determine log level
      const statusMatch = message.match(/\s(\d{3})\s/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 200;

      if (status >= 500) {
        logger.error(message.trim());
      } else if (status >= 400) {
        logger.warn(message.trim());
      } else {
        logger.info(message.trim());
      }
    },
  },
  skip: (req, res) => {
    // Skip logging for health check endpoint in production
    return process.env.NODE_ENV === 'production' && req.path === '/health';
  },
});

/**
 * Request timing middleware
 */
const requestTimer = (req, res, next) => {
  req._requestStartTime = process.hrtime();
  next();
};

/**
 * Request ID middleware for tracking
 */
const requestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Detailed request logger middleware
 */
const detailedRequestLogger = (req, res, next) => {
  // Log request details
  logger.debug('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    // Log response details
    const duration = req._requestStartTime
      ? process.hrtime(req._requestStartTime)
      : [0, 0];
    const durationMs = (duration[0] * 1e3 + duration[1] * 1e-6).toFixed(2);

    logger.debug('Outgoing response', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${durationMs}ms`,
      userId: req.user?.userId,
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Error request logger - logs failed requests
 */
const errorRequestLogger = (err, req, res, next) => {
  logger.error('Request failed', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    userId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  next(err);
};

module.exports = {
  requestLogger,
  requestTimer,
  requestId,
  detailedRequestLogger,
  errorRequestLogger,
};
