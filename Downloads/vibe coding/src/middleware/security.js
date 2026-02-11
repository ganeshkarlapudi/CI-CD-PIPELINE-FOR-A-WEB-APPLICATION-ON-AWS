const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Rate limiting middleware - 100 requests per minute per user
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP address
    return req.user?.userId || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for ${req.user?.username || req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
});

/**
 * Stricter rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address for auth endpoints
    return req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * XSS sanitization middleware
 * Sanitizes user input to prevent XSS attacks
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }

  return sanitized;
};

/**
 * Sanitize string to prevent XSS
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }

  // Replace dangerous characters
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * CORS configuration with whitelist
 */
const getCorsOptions = () => {
  // Get allowed origins from environment variable
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost',        // For Nginx frontend on port 80
      'http://127.0.0.1',        // For Nginx frontend on port 80
      'http://localhost:80',     // Explicit port 80
      'http://127.0.0.1:80'      // Explicit port 80
    ];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  };
};

/**
 * Helmet configuration for security headers
 */
const getHelmetOptions = () => {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://stackpath.bootstrapcdn.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdn.plot.ly'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow loading external resources
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  };
};

module.exports = {
  apiLimiter,
  authLimiter,
  sanitizeInput,
  getCorsOptions,
  getHelmetOptions,
};
