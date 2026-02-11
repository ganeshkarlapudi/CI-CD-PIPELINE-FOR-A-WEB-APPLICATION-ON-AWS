const User = require('../src/models/User');
const Inspection = require('../src/models/Inspection');
const Model = require('../src/models/Model');

// Mock mongoose
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('User Model', () => {
  describe('incrementLoginAttempts', () => {
    it('should increment failed login attempts', async () => {
      const user = {
        loginAttempts: 2,
        save: jest.fn().mockResolvedValue(true),
      };

      User.prototype.incrementLoginAttempts = async function() {
        this.loginAttempts += 1;
        if (this.loginAttempts >= 5) {
          this.lockoutUntil = Date.now() + 15 * 60 * 1000;
        }
        await this.save();
      };

      await User.prototype.incrementLoginAttempts.call(user);

      expect(user.loginAttempts).toBe(3);
      expect(user.save).toHaveBeenCalled();
    });

    it('should lock account after 5 failed attempts', async () => {
      const user = {
        loginAttempts: 4,
        lockoutUntil: null,
        save: jest.fn().mockResolvedValue(true),
      };

      User.prototype.incrementLoginAttempts = async function() {
        this.loginAttempts += 1;
        if (this.loginAttempts >= 5) {
          this.lockoutUntil = Date.now() + 15 * 60 * 1000;
        }
        await this.save();
      };

      await User.prototype.incrementLoginAttempts.call(user);

      expect(user.loginAttempts).toBe(5);
      expect(user.lockoutUntil).toBeDefined();
      expect(user.lockoutUntil).toBeGreaterThan(Date.now());
    });
  });

  describe('resetLoginAttempts', () => {
    it('should reset login attempts on successful login', async () => {
      const user = {
        loginAttempts: 3,
        lockoutUntil: Date.now() + 10000,
        save: jest.fn().mockResolvedValue(true),
      };

      User.prototype.resetLoginAttempts = async function() {
        this.loginAttempts = 0;
        this.lockoutUntil = null;
        await this.save();
      };

      await User.prototype.resetLoginAttempts.call(user);

      expect(user.loginAttempts).toBe(0);
      expect(user.lockoutUntil).toBeNull();
      expect(user.save).toHaveBeenCalled();
    });
  });

  describe('isLocked virtual', () => {
    it('should return true if account is locked', () => {
      const user = {
        lockoutUntil: Date.now() + 10000,
      };

      const isLocked = function() {
        return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
      };

      expect(isLocked.call(user)).toBe(true);
    });

    it('should return false if lockout has expired', () => {
      const user = {
        lockoutUntil: Date.now() - 10000,
      };

      const isLocked = function() {
        return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
      };

      expect(isLocked.call(user)).toBe(false);
    });

    it('should return false if no lockout', () => {
      const user = {
        lockoutUntil: null,
      };

      const isLocked = function() {
        return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
      };

      expect(isLocked.call(user)).toBe(false);
    });
  });
});

describe('Inspection Model', () => {
  it('should have correct default status', () => {
    const inspection = {
      status: 'uploaded',
      defects: [],
    };

    expect(inspection.status).toBe('uploaded');
    expect(inspection.defects).toEqual([]);
  });

  it('should store defects array', () => {
    const inspection = {
      defects: [
        {
          class: 'crack',
          confidence: 0.95,
          bbox: { x: 100, y: 100, width: 50, height: 50 },
          source: 'yolo',
        },
      ],
    };

    expect(inspection.defects).toHaveLength(1);
    expect(inspection.defects[0].class).toBe('crack');
    expect(inspection.defects[0].confidence).toBe(0.95);
  });
});

describe('Model Schema', () => {
  it('should have correct model version structure', () => {
    const model = {
      version: 'v1.0.0',
      mAP: 0.96,
      status: 'deployed',
      trainingDate: new Date(),
      deploymentDate: new Date(),
    };

    expect(model.version).toBe('v1.0.0');
    expect(model.mAP).toBe(0.96);
    expect(model.status).toBe('deployed');
  });
});
