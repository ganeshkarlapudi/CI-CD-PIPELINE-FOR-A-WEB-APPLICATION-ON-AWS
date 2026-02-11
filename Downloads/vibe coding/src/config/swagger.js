const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Aircraft Defect Detection API',
      version: '1.0.0',
      description: 'API documentation for the Aircraft Defect Detection System using YOLOv8 and GPT Vision',
      contact: {
        name: 'API Support',
        email: 'support@aircraft-defect-detection.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.aircraft-defect-detection.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'ERROR_CODE',
                },
                message: {
                  type: 'string',
                  example: 'Error message description',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              example: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Defect: {
          type: 'object',
          properties: {
            class: {
              type: 'string',
              example: 'crack',
              description: 'Type of defect detected',
            },
            confidence: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              example: 0.95,
            },
            bbox: {
              type: 'object',
              properties: {
                x: { type: 'number', example: 100 },
                y: { type: 'number', example: 150 },
                width: { type: 'number', example: 50 },
                height: { type: 'number', example: 75 },
              },
            },
            source: {
              type: 'string',
              enum: ['yolo', 'gpt', 'ensemble'],
              example: 'ensemble',
            },
          },
        },
        Inspection: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://s3.amazonaws.com/bucket/image.jpg',
            },
            status: {
              type: 'string',
              enum: ['uploaded', 'processing', 'completed', 'failed'],
              example: 'completed',
            },
            defects: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Defect',
              },
            },
            processingTime: {
              type: 'number',
              example: 1500,
              description: 'Processing time in milliseconds',
            },
            modelVersion: {
              type: 'string',
              example: 'v1.0.0',
            },
            imageMetadata: {
              type: 'object',
              properties: {
                filename: { type: 'string', example: 'aircraft-wing.jpg' },
                size: { type: 'number', example: 1024000 },
                format: { type: 'string', example: 'jpeg' },
                dimensions: {
                  type: 'object',
                  properties: {
                    width: { type: 'number', example: 1920 },
                    height: { type: 'number', example: 1080 },
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
