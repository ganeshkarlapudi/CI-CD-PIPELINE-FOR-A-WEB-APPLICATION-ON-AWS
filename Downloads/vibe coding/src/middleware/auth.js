const jwt = require('jsonwebtoken');
const { isTokenBlacklisted, getSessionToken } = require('../config/redis');
const User = require('../models/User');
const logger = require('../config/logger');

// Verify JWT token and authenticate user
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'No token provided',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted in Redis
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Token has been invalidated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Try to get session from Redis cache first
    let sessionData = await getSessionToken(token);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If session data exists in cache, use it; otherwise fetch from database
    let user;
    if (sessionData) {
      logger.debug(`Using cached session for user: ${sessionData.username}`);
      user = {
        _id: sessionData.userId,
        username: sessionData.username,
        role: sessionData.role,
        status: 'active', // Assume active if in cache
      };
    } else {
      // Fetch user from database
      user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account has been deactivated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Attach user data to request object
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
