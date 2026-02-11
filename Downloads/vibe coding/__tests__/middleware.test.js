const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../src/middleware/auth');
const User = require('../src/models/User');
const { isTokenBlacklisted, getSessionToken } = require('../src/config/redis');

// Mock dependencies
jest.mock('../src/models/User');
jest.mock('../src/config/redis');
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET
      );

      req.headers.authorization = `Bearer ${token}`;
      isTokenBlacklisted.mockResolvedValue(false);
      getSessionToken.mockResolvedValue(null);
      User.findById.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        status: 'active',
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.username).toBe('testuser');
      expect(req.token).toBe(token);
    });

    it('should use cached session data', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET
      );

      req.headers.authorization = `Bearer ${token}`;
      isTokenBlacklisted.mockResolvedValue(false);
      getSessionToken.mockResolvedValue({
        userId: 'user123',
        username: 'testuser',
        role: 'user',
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(User.findById).not.toHaveBeenCalled();
      expect(req.user.username).toBe('testuser');
    });

    it('should reject request without token', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_FAILED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject blacklisted token', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET
      );

      req.headers.authorization = `Bearer ${token}`;
      isTokenBlacklisted.mockResolvedValue(true);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_FAILED',
            message: 'Token has been invalidated',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      req.headers.authorization = `Bearer ${token}`;
      isTokenBlacklisted.mockResolvedValue(false);

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOKEN_EXPIRED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      isTokenBlacklisted.mockResolvedValue(false);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject inactive user', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET
      );

      req.headers.authorization = `Bearer ${token}`;
      isTokenBlacklisted.mockResolvedValue(false);
      getSessionToken.mockResolvedValue(null);
      User.findById.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        role: 'user',
        status: 'inactive',
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'ACCOUNT_INACTIVE',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when user not found', async () => {
      const token = jwt.sign(
        { userId: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET
      );

      req.headers.authorization = `Bearer ${token}`;
      isTokenBlacklisted.mockResolvedValue(false);
      getSessionToken.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_FAILED',
            message: 'User not found',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      req.user = {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
      };
    });

    it('should allow access for authorized role', () => {
      const middleware = authorize('user', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user not authenticated', () => {
      req.user = null;
      const middleware = authorize('user');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_FAILED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin access to admin-only routes', () => {
      req.user.role = 'admin';
      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

describe('Validation Middleware', () => {
  it('should export validation functions', () => {
    const { registerValidation, loginValidation } = require('../src/middleware/validation');
    
    expect(registerValidation).toBeDefined();
    expect(loginValidation).toBeDefined();
    expect(Array.isArray(registerValidation)).toBe(true);
    expect(Array.isArray(loginValidation)).toBe(true);
  });
});
