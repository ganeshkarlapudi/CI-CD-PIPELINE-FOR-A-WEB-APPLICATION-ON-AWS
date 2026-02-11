const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const authRouter = require('../src/routes/auth');
const User = require('../src/models/User');
const { storeSessionToken, blacklistToken, isTokenBlacklisted } = require('../src/config/redis');

// Mock dependencies
jest.mock('../src/models/User');
jest.mock('../src/config/redis');
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test@1234',
    };

    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        _id: 'user123',
        username: validUser.username,
        email: validUser.email,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe('user123');
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should reject registration with existing username', async () => {
      User.findOne.mockResolvedValueOnce({ username: validUser.username });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USERNAME_EXISTS');
    });

    it('should reject registration with existing email', async () => {
      User.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: validUser.email });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginCredentials = {
      username: 'testuser',
      password: 'Test@1234',
    };

    const mockUser = {
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$10$hashedpassword',
      role: 'user',
      status: 'active',
      isLocked: false,
      resetLoginAttempts: jest.fn(),
      incrementLoginAttempts: jest.fn(),
    };

    it('should login successfully with valid credentials', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      storeSessionToken.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(mockUser.resetLoginAttempts).toHaveBeenCalled();
    });

    it('should reject login with invalid username', async () => {
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(mockUser.incrementLoginAttempts).toHaveBeenCalled();
    });

    it('should reject login for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        isLocked: true,
        lockoutUntil: Date.now() + 300000, // 5 minutes from now
      };
      User.findOne.mockResolvedValue(lockedUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('should reject login for inactive account', async () => {
      const inactiveUser = {
        ...mockUser,
        status: 'inactive',
      };
      User.findOne.mockResolvedValue(inactiveUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET
      );

      User.findById.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        role: 'user',
        status: 'active',
      });

      isTokenBlacklisted.mockResolvedValue(false);
      blacklistToken.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
      expect(blacklistToken).toHaveBeenCalled();
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET
      );

      User.findById.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        role: 'user',
        status: 'active',
      });

      isTokenBlacklisted.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.username).toBe('testuser');
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });
});
