require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const {
  errorHandler,
  notFoundHandler,
  requestLogger,
  requestTimer,
  requestId,
  detailedRequestLogger,
  apiLimiter,
  sanitizeInput,
  getCorsOptions,
  getHelmetOptions,
} = require('./middleware');

const app = express();

// Request tracking middleware (must be first)
app.use(requestTimer);
app.use(requestId);

// Security middleware - Helmet with enhanced configuration
app.use(helmet(getHelmetOptions()));

// CORS middleware with whitelist
app.use(cors(getCorsOptions()));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS sanitization middleware
app.use(sanitizeInput);

// Request logging middleware
app.use(requestLogger);

// Rate limiting middleware (apply to all API routes)
app.use('/api', apiLimiter);

// Detailed request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(detailedRequestLogger);
}

// Serve static files from public directory
app.use(express.static('public'));

// Serve uploaded files (for local storage)
app.use('/uploads', express.static('uploads'));

// Swagger API Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Aircraft Defect Detection API Docs',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/admin', require('./routes/admin'));

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Centralized error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB (non-blocking)
    try {
      await connectDB();
    } catch (error) {
      logger.warn('MongoDB connection failed, continuing without database');
    }

    // Connect to Redis (non-blocking)
    try {
      await connectRedis();
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache');
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
