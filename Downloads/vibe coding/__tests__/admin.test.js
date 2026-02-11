const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const adminRouter = require('../src/routes/admin');
const User = require('../src/models/User');
const Model = require('../src/models/Model');
const Inspection = require('../src/models/Inspection');
const ApiLog = require('../src/models/ApiLog');
const SystemLog = require('../src/models/SystemLog');

// Mock dependencies
jest.mock('../src/models/User');
jest.mock('../src/models/Model');
jest.mock('../src/models/Inspection');
jest.mock('../src/models/ApiLog');
jest.mock('../src/models/SystemLog');
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

describe('Admin Endpoints', () => {
  let adminToken, userToken;
  const mockAdmin = {
    id: 'admin123',
    userId: 'admin123',
    username: 'admin',
    role: 'admin',
  };
  const mockUser = {
    id: 'user123',
    userId: 'user123',
    username: 'testuser',
    role: 'user',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = jwt.sign(mockAdmin, process.env.JWT_SECRET);
    userToken = jwt.sign(mockUser, process.env.JWT_SECRET);
  });

  describe('GET /api/admin/users', () => {
    it('should get all users for admin', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          username: 'user1',
          email: 'user1@example.com',
          role: 'user',
          status: 'active',
        },
      ];

      User.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockUsers),
      });
      User.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(1);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should search users by username', async () => {
      User.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([]),
      });
      User.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'testuser' });

      expect(response.status).toBe(200);
      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.any(Object),
        })
      );
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create new user', async () => {
      const newUserData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Test@1234',
        role: 'user',
      };

      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        _id: 'newuser123',
        ...newUserData,
      });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject duplicate username', async () => {
      User.findOne.mockResolvedValue({ username: 'existinguser' });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'existinguser',
          email: 'new@example.com',
          password: 'Test@1234',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user role', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        role: 'user',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/admin/users/user123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockUser.role).toBe('admin');
    });

    it('should update user status', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/admin/users/user123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' });

      expect(response.status).toBe(200);
      expect(mockUser.status).toBe('inactive');
    });

    it('should return 404 for non-existent user', async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/admin/users/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should deactivate user', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .delete('/api/admin/users/user123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockUser.status).toBe('inactive');
    });
  });

  describe('GET /api/admin/models', () => {
    it('should get all models', async () => {
      const mockModels = [
        {
          _id: 'model1',
          version: 'v1.0.0',
          mAP: 0.96,
          status: 'deployed',
        },
      ];

      Model.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockModels),
      });

      const response = await request(app)
        .get('/api/admin/models')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.models).toHaveLength(1);
    });
  });

  describe('GET /api/admin/monitoring/metrics', () => {
    it('should get system metrics', async () => {
      Inspection.countDocuments.mockResolvedValue(100);
      Inspection.aggregate.mockResolvedValue([
        { _id: null, avgProcessingTime: 1500 },
      ]);
      User.countDocuments.mockResolvedValue(50);
      ApiLog.aggregate.mockResolvedValue([
        { _id: null, totalCost: 25.50 },
      ]);
      SystemLog.countDocuments.mockResolvedValue(10);

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalInspections).toBe(100);
      expect(response.body.data.activeUsers).toBe(50);
    });

    it('should filter metrics by date range', async () => {
      Inspection.countDocuments.mockResolvedValue(10);
      Inspection.aggregate.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(5);
      ApiLog.aggregate.mockResolvedValue([]);
      SystemLog.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

      expect(response.status).toBe(200);
      expect(Inspection.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(Object),
        })
      );
    });
  });

  describe('GET /api/admin/monitoring/logs', () => {
    it('should get system logs', async () => {
      const mockLogs = [
        {
          _id: 'log1',
          level: 'error',
          message: 'Test error',
          timestamp: new Date(),
        },
      ];

      SystemLog.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLogs),
      });
      SystemLog.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/admin/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(1);
    });

    it('should filter logs by severity', async () => {
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
  });
});
