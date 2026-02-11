const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const inspectionsRouter = require('../src/routes/inspections');
const Inspection = require('../src/models/Inspection');
const { uploadFile } = require('../src/config/storage');
const { processUploadedImage, calculateImageQuality } = require('../src/services/imageService');

// Mock dependencies
jest.mock('../src/models/Inspection');
jest.mock('../src/config/storage');
jest.mock('../src/services/imageService');
jest.mock('../src/config/redis');
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/inspections', inspectionsRouter);

describe('Inspection Endpoints', () => {
  let authToken;
  const mockUser = {
    id: 'user123',
    userId: 'user123',
    username: 'testuser',
    role: 'user',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = jwt.sign(mockUser, process.env.JWT_SECRET);
  });

  describe('GET /api/inspections', () => {
    it('should get inspection history with pagination', async () => {
      const mockInspections = [
        {
          _id: 'insp1',
          userId: 'user123',
          imageUrl: 'https://example.com/image1.jpg',
          status: 'completed',
          defects: [],
          createdAt: new Date(),
        },
      ];

      Inspection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockInspections),
      });
      Inspection.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/inspections')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inspections).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter inspections by date range', async () => {
      Inspection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      Inspection.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/inspections')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

      expect(response.status).toBe(200);
      expect(Inspection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(Object),
        })
      );
    });

    it('should reject invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/inspections')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 0, limit: 200 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/inspections/:id', () => {
    it('should get inspection by ID', async () => {
      const mockInspection = {
        _id: 'insp1',
        userId: 'user123',
        imageUrl: 'https://example.com/image1.jpg',
        status: 'completed',
        defects: [],
      };

      Inspection.findById.mockResolvedValue(mockInspection);

      const response = await request(app)
        .get('/api/inspections/insp1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe('insp1');
    });

    it('should return 404 for non-existent inspection', async () => {
      Inspection.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/inspections/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should deny access to other users inspections', async () => {
      const mockInspection = {
        _id: 'insp1',
        userId: 'otheruser',
        imageUrl: 'https://example.com/image1.jpg',
        status: 'completed',
      };

      Inspection.findById.mockResolvedValue(mockInspection);

      const response = await request(app)
        .get('/api/inspections/insp1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/inspections/:id/results', () => {
    it('should get completed inspection results', async () => {
      const mockInspection = {
        _id: 'insp1',
        userId: 'user123',
        imageUrl: 'https://example.com/image1.jpg',
        status: 'completed',
        defects: [
          {
            class: 'crack',
            confidence: 0.95,
            bbox: { x: 100, y: 100, width: 50, height: 50 },
          },
        ],
        processingTime: 1500,
        modelVersion: 'v1.0.0',
      };

      Inspection.findById.mockResolvedValue(mockInspection);

      const response = await request(app)
        .get('/api/inspections/insp1/results')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.defects).toHaveLength(1);
      expect(response.body.data.status).toBe('completed');
    });

    it('should handle processing status', async () => {
      const mockInspection = {
        _id: 'insp1',
        userId: 'user123',
        imageUrl: 'https://example.com/image1.jpg',
        status: 'processing',
      };

      Inspection.findById.mockResolvedValue(mockInspection);

      const response = await request(app)
        .get('/api/inspections/insp1/results')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('processing');
      expect(response.body.data.message).toContain('in progress');
    });

    it('should handle failed status', async () => {
      const mockInspection = {
        _id: 'insp1',
        userId: 'user123',
        imageUrl: 'https://example.com/image1.jpg',
        status: 'failed',
        errorMessage: 'ML service error',
      };

      Inspection.findById.mockResolvedValue(mockInspection);

      const response = await request(app)
        .get('/api/inspections/insp1/results')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.errorMessage).toBe('ML service error');
    });
  });

  describe('GET /api/inspections/:id/report', () => {
    const mockInspection = {
      _id: 'insp1',
      userId: 'user123',
      imageUrl: 'https://example.com/image1.jpg',
      status: 'completed',
      defects: [
        {
          class: 'crack',
          confidence: 0.95,
          bbox: { x: 100, y: 100, width: 50, height: 50 },
          source: 'yolo',
        },
      ],
      processingTime: 1500,
      modelVersion: 'v1.0.0',
      imageMetadata: {
        filename: 'test.jpg',
        dimensions: { width: 1920, height: 1080 },
      },
      createdAt: new Date(),
    };

    it('should generate JSON report', async () => {
      Inspection.findById.mockResolvedValue(mockInspection);

      const response = await request(app)
        .get('/api/inspections/insp1/report')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.metadata).toBeDefined();
      expect(response.body.defects).toHaveLength(1);
      expect(response.body.summary).toBeDefined();
    });

    it('should reject report for non-completed inspection', async () => {
      const processingInspection = {
        ...mockInspection,
        status: 'processing',
      };

      Inspection.findById.mockResolvedValue(processingInspection);

      const response = await request(app)
        .get('/api/inspections/insp1/report')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });
});
