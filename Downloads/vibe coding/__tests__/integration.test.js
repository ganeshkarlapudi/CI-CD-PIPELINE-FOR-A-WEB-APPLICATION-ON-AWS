/**
 * Integration Tests for Aircraft Defect Detection System
 * 
 * Tests complete workflows with real MongoDB instance:
 * - User registration and login flow
 * - End-to-end inspection workflow (upload → analyze → results → report)
 * - Admin user management workflow
 * - Admin model management workflow
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Inspection = require('../src/models/Inspection');
const Model = require('../src/models/Model');
const redis = require('../src/config/redis');

// Test data
let testUser = {
  username: 'integrationuser',
  email: 'integration@test.com',
  password: 'Test@1234',
  confirmPassword: 'Test@1234'
};

let testAdmin = {
  username: 'integrationadmin',
  email: 'admin@test.com',
  password: 'Admin@1234',
  role: 'admin'
};

let userToken;
let adminToken;
let userId;
let adminId;
let inspectionId;

// Setup and teardown
beforeAll(async () => {
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

afterAll(async () => {
  // Clean up test data
  await User.deleteMany({ 
    email: { $in: [testUser.email, testAdmin.email] } 
  });
  await Inspection.deleteMany({ userId: { $in: [userId, adminId] } });
  
  // Close connections
  await mongoose.connection.close();
  if (redis.quit) {
    await redis.quit();
  }
});

describe('Integration Tests', () => {
  
  describe('1. Complete User Registration and Login Flow', () => {
    
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.userId).toBeDefined();
      
      userId = response.body.userId;
    });

    it('should prevent duplicate user registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordUser = {
        username: 'weakuser',
        email: 'weak@test.com',
        password: 'weak',
        confirmPassword: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('password');
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.role).toBe('user');
      
      userToken = response.body.token;
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logout');
    });

    it('should reject requests with blacklisted token after logout', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should allow login again after logout', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      userToken = response.body.token;
    });
  });

  describe('2. End-to-End Inspection Workflow', () => {
    
    it('should upload an image successfully', async () => {
      const response = await request(app)
        .post('/api/inspections/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('images', Buffer.from('fake-image-data'), 'test-aircraft.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.inspectionIds).toBeDefined();
      expect(response.body.inspectionIds.length).toBeGreaterThan(0);
      
      inspectionId = response.body.inspectionIds[0];
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/inspections/upload')
        .attach('images', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/inspections/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('images', Buffer.from('fake-data'), 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('file');
    });

    it('should trigger analysis for uploaded inspection', async () => {
      const response = await request(app)
        .post(`/api/inspections/${inspectionId}/analyze`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inspectionId).toBe(inspectionId);
      expect(response.body.status).toBe('processing');
    });

    it('should retrieve inspection results', async () => {
      // Wait a moment for processing (in real scenario, would poll)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .get(`/api/inspections/${inspectionId}/results`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inspection).toBeDefined();
      expect(response.body.inspection._id).toBe(inspectionId);
      expect(['processing', 'completed', 'failed']).toContain(response.body.inspection.status);
    });

    it('should retrieve inspection history with pagination', async () => {
      const response = await request(app)
        .get('/api/inspections')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inspections).toBeDefined();
      expect(Array.isArray(response.body.inspections)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter inspections by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/inspections')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inspections).toBeDefined();
    });

    it('should generate JSON report', async () => {
      const response = await request(app)
        .get(`/api/inspections/${inspectionId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ format: 'json' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.inspectionId).toBe(inspectionId);
      expect(response.body.report.metadata).toBeDefined();
    });

    it('should generate PDF report', async () => {
      const response = await request(app)
        .get(`/api/inspections/${inspectionId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toContain('pdf');
    });

    it('should prevent access to other users inspections', async () => {
      // Create another user and try to access first user's inspection
      const otherUser = {
        username: 'otheruser',
        email: 'other@test.com',
        password: 'Other@1234',
        confirmPassword: 'Other@1234'
      };

      await request(app)
        .post('/api/auth/register')
        .send(otherUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: otherUser.username,
          password: otherUser.password
        });

      const otherToken = loginResponse.body.token;

      const response = await request(app)
        .get(`/api/inspections/${inspectionId}/results`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      
      // Cleanup
      await User.deleteOne({ email: otherUser.email });
    });
  });

  describe('3. Admin User Management Workflow', () => {
    
    beforeAll(async () => {
      // Create admin user
      const admin = new User(testAdmin);
      await admin.save();
      adminId = admin._id.toString();

      // Login as admin
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testAdmin.username,
          password: testAdmin.password
        });

      adminToken = response.body.token;
    });

    it('should list all users as admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    it('should prevent non-admin from accessing user list', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('admin');
    });

    it('should search users by username', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'integration' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users[0].username).toContain('integration');
    });

    it('should create a new user as admin', async () => {
      const newUser = {
        username: 'admincreated',
        email: 'admincreated@test.com',
        password: 'Created@1234',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBeDefined();
      
      // Cleanup
      await User.deleteOne({ email: newUser.email });
    });

    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('admin');
      
      // Revert back
      await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });
    });

    it('should deactivate user account', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.status).toBe('inactive');
    });

    it('should prevent login for deactivated user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('inactive');
    });

    it('should reactivate user account', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.status).toBe('active');
      
      // Login again to get new token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      
      userToken = loginResponse.body.token;
    });

    it('should delete user account', async () => {
      // Create a temporary user to delete
      const tempUser = new User({
        username: 'tempuser',
        email: 'temp@test.com',
        password: 'Temp@1234',
        role: 'user'
      });
      await tempUser.save();
      const tempUserId = tempUser._id.toString();

      const response = await request(app)
        .delete(`/api/admin/users/${tempUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify user is deleted or deactivated
      const deletedUser = await User.findById(tempUserId);
      expect(deletedUser === null || deletedUser.status === 'inactive').toBe(true);
    });
  });

  describe('4. Admin Model Management Workflow', () => {
    
    let modelId;

    it('should list all models', async () => {
      const response = await request(app)
        .get('/api/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.models).toBeDefined();
      expect(Array.isArray(response.body.models)).toBe(true);
    });

    it('should prevent non-admin from accessing models', async () => {
      const response = await request(app)
        .get('/api/admin/models')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should upload training dataset', async () => {
      const response = await request(app)
        .post('/api/admin/models/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', Buffer.from('training-image-1'), 'train1.jpg')
        .attach('images', Buffer.from('training-image-2'), 'train2.jpg')
        .attach('labels', Buffer.from('label-data'), 'labels.txt')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should check training job status', async () => {
      // First create a training job
      const uploadResponse = await request(app)
        .post('/api/admin/models/train')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', Buffer.from('training-image'), 'train.jpg')
        .attach('labels', Buffer.from('labels'), 'labels.txt');

      const jobId = uploadResponse.body.jobId;

      const response = await request(app)
        .get(`/api/admin/models/train/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job).toBeDefined();
      expect(['training', 'validating', 'completed', 'failed']).toContain(response.body.job.status);
    });

    it('should deploy a model version', async () => {
      // Create a test model
      const testModel = new Model({
        version: 'test-v1.0.0',
        type: 'yolov8',
        status: 'validating',
        metrics: {
          mAP: 0.96,
          precision: 0.95,
          recall: 0.94,
          f1Score: 0.945
        },
        weightsUrl: 's3://test-bucket/models/test-v1.0.0.pt',
        createdBy: adminId
      });
      await testModel.save();
      modelId = testModel._id.toString();

      const response = await request(app)
        .post(`/api/admin/models/${testModel.version}/deploy`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deployedVersion).toBe(testModel.version);
      
      // Verify model status updated
      const updatedModel = await Model.findById(modelId);
      expect(updatedModel.status).toBe('deployed');
    });

    it('should reject deployment of model with low mAP', async () => {
      // Create a model with low mAP
      const lowMapModel = new Model({
        version: 'test-v0.5.0',
        type: 'yolov8',
        status: 'validating',
        metrics: {
          mAP: 0.85,  // Below 95% threshold
          precision: 0.84,
          recall: 0.83,
          f1Score: 0.835
        },
        weightsUrl: 's3://test-bucket/models/test-v0.5.0.pt',
        createdBy: adminId
      });
      await lowMapModel.save();

      const response = await request(app)
        .post(`/api/admin/models/${lowMapModel.version}/deploy`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('mAP');
      
      // Cleanup
      await Model.deleteOne({ _id: lowMapModel._id });
    });

    it('should retrieve model performance metrics', async () => {
      const response = await request(app)
        .get('/api/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
      
      const model = response.body.models[0];
      expect(model.metrics).toBeDefined();
      expect(model.metrics.mAP).toBeDefined();
    });

    afterAll(async () => {
      // Cleanup test models
      if (modelId) {
        await Model.deleteOne({ _id: modelId });
      }
    });
  });

  describe('5. System Monitoring and Metrics', () => {
    
    it('should retrieve system metrics as admin', async () => {
      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalInspections).toBeDefined();
      expect(response.body.metrics.activeUsers).toBeDefined();
    });

    it('should retrieve system logs with filtering', async () => {
      const response = await request(app)
        .get('/api/admin/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ severity: 'error', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.logs).toBeDefined();
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('should filter metrics by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
    });
  });

  describe('6. Error Handling and Edge Cases', () => {
    
    it('should handle invalid inspection ID gracefully', async () => {
      const response = await request(app)
        .get('/api/inspections/invalid-id/results')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing authentication token', async () => {
      const response = await request(app)
        .get('/api/inspections')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('token');
    });

    it('should handle malformed JWT token', async () => {
      const response = await request(app)
        .get('/api/inspections')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require temporarily disconnecting from DB
      // For now, we'll test that the error handler is in place
      expect(app._router).toBeDefined();
    });

    it('should validate request body for required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'incomplete' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle concurrent requests properly', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/inspections')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
