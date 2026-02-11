const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const adminRouter = require('../src/routes/admin');
const Inspection = require('../src/models/Inspection');
const ApiLog = require('../src/models/ApiLog');
const SystemLog = require('../src/models/SystemLog');

// Mock dependencies
jest.mock('../src/models/Inspection');
jest.mock('../src/models/ApiLog');
jest.mock('../src/models/SystemLog');
jest.mock('../src/models/User');
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
app.use('/api/admin', adminRouter);

describe('Monitoring Endpoints', () => {
  let adminToken;
  const mockAdmin = {
    id: 'admin123',
    userId: 'admin123',
    username: 'admin',
    role: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = jwt.sign(mockAdmin, process.env.JWT_SECRET);
  });

  describe('GET /api/admin/monitoring/metrics', () => {
    it('should return comprehensive system metrics', async () => {
      Inspection.countDocuments.mockResolvedValue(150);
      Inspection.aggregate.mockResolvedValue([
        { _id: null, avgProcessingTime: 2000, totalDefects: 450 },
      ]);
      
      const User = require('../src/models/User');
      User.countDocuments.mockResolvedValue(75);

      ApiLog.aggregate.mockResolvedValue([
        { _id: null, totalCost: 125.75, totalCalls: 200 },
      ]);

      SystemLog.countDocuments.mockResolvedValue(25);

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalInspections');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data.totalInspections).toBe(150);
    });

    it('should calculate average processing time correctly', async () => {
      Inspection.countDocuments.mockResolvedValue(10);
      Inspection.aggregate.mockResolvedValue([
        { _id: null, avgProcessingTime: 1500 },
      ]);

      const User = require('../src/models/User');
      User.countDocuments.mockResolvedValue(5);
      ApiLog.aggregate.mockResolvedValue([]);
      SystemLog.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.avgProcessingTime).toBeDefined();
    });

    it('should handle empty metrics gracefully', async () => {
      Inspection.countDocuments.mockResolvedValue(0);
      Inspection.aggregate.mockResolvedValue([]);
      
      const User = require('../src/models/User');
      User.countDocuments.mockResolvedValue(0);
      ApiLog.aggregate.mockResolvedValue([]);
      SystemLog.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/monitoring/logs', () => {
    it('should return paginated system logs', async () => {
      const mockLogs = [
        {
          _id: 'log1',
          level: 'error',
          message: 'Database connection failed',
          timestamp: new Date(),
          metadata: {},
        },
        {
          _id: 'log2',
          level: 'warning',
          message: 'High memory usage',
          timestamp: new Date(),
          metadata: {},
        },
      ];

      SystemLog.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLogs),
      });
      SystemLog.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/admin/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter logs by severity level', async () => {
      SystemLog.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      SystemLog.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/admin/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ level: 'error' });

      expect(response.status).toBe(200);
      expect(SystemLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
        })
      );
    });

    it('should filter logs by date range', async () => {
      SystemLog.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      SystemLog.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/admin/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

      expect(response.status).toBe(200);
      expect(SystemLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Object),
        })
      );
    });

    it('should sort logs by timestamp descending', async () => {
      const sortMock = jest.fn().mockReturnThis();
      SystemLog.find.mockReturnValue({
        sort: sortMock,
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      SystemLog.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/admin/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
    });
  });

  describe('API Cost Tracking', () => {
    it('should calculate total API costs', async () => {
      Inspection.countDocuments.mockResolvedValue(50);
      Inspection.aggregate.mockResolvedValue([]);
      
      const User = require('../src/models/User');
      User.countDocuments.mockResolvedValue(10);

      ApiLog.aggregate.mockResolvedValue([
        { _id: null, totalCost: 45.25, totalCalls: 100 },
      ]);

      SystemLog.countDocuments.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.apiCosts).toBeDefined();
    });
  });

  describe('Error Rate Monitoring', () => {
    it('should track error occurrences', async () => {
      Inspection.countDocuments.mockResolvedValue(100);
      Inspection.aggregate.mockResolvedValue([]);
      
      const User = require('../src/models/User');
      User.countDocuments.mockResolvedValue(20);
      ApiLog.aggregate.mockResolvedValue([]);

      SystemLog.countDocuments
        .mockResolvedValueOnce(15) // Total logs
        .mockResolvedValueOnce(5); // Error logs

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(SystemLog.countDocuments).toHaveBeenCalled();
    });
  });
});
