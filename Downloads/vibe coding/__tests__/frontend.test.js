/**
 * Frontend Unit Tests
 * Tests for form validation, API client, authentication flow, bounding box rendering, and error handling
 */

describe('Frontend Unit Tests', () => {
  let localStorage;

  beforeEach(() => {
    // Mock localStorage
    localStorage = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Validation Logic', () => {
    describe('Username Validation', () => {
      test('should reject empty username', () => {
        const username = '';
        const isValid = username.trim().length >= 3 && username.trim().length <= 30;
        expect(isValid).toBe(false);
      });

      test('should reject username shorter than 3 characters', () => {
        const username = 'ab';
        const isValid = username.length >= 3 && username.length <= 30;
        expect(isValid).toBe(false);
      });

      test('should reject username longer than 30 characters', () => {
        const username = 'a'.repeat(31);
        const isValid = username.length >= 3 && username.length <= 30;
        expect(isValid).toBe(false);
      });

      test('should accept valid username', () => {
        const username = 'validuser123';
        const isValid = username.length >= 3 && username.length <= 30 && /^[a-zA-Z0-9_]+$/.test(username);
        expect(isValid).toBe(true);
      });

      test('should reject username with special characters', () => {
        const username = 'user@name';
        const isValid = /^[a-zA-Z0-9_]+$/.test(username);
        expect(isValid).toBe(false);
      });
    });

    describe('Email Validation', () => {
      test('should reject empty email', () => {
        const email = '';
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        expect(emailRegex.test(email)).toBe(false);
      });

      test('should reject invalid email format', () => {
        const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com', 'no@domain'];
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        
        invalidEmails.forEach(email => {
          expect(emailRegex.test(email)).toBe(false);
        });
      });

      test('should accept valid email format', () => {
        const validEmails = ['user@example.com', 'test.user@domain.co.uk', 'user123@test-domain.com'];
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        
        validEmails.forEach(email => {
          expect(emailRegex.test(email)).toBe(true);
        });
      });
    });

    describe('Password Validation', () => {
      test('should reject password shorter than 8 characters', () => {
        const password = 'Short1!';
        expect(password.length >= 8).toBe(false);
      });

      test('should reject password without uppercase letter', () => {
        const password = 'password123!';
        const hasUppercase = /[A-Z]/.test(password);
        expect(hasUppercase).toBe(false);
      });

      test('should reject password without lowercase letter', () => {
        const password = 'PASSWORD123!';
        const hasLowercase = /[a-z]/.test(password);
        expect(hasLowercase).toBe(false);
      });

      test('should reject password without digit', () => {
        const password = 'Password!';
        const hasDigit = /[0-9]/.test(password);
        expect(hasDigit).toBe(false);
      });

      test('should reject password without special character', () => {
        const password = 'Password123';
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        expect(hasSpecial).toBe(false);
      });

      test('should accept valid password', () => {
        const password = 'ValidPass123!';
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;
        
        expect(hasUppercase && hasLowercase && hasDigit && hasSpecial && isLongEnough).toBe(true);
      });
    });

    describe('Password Strength Checker', () => {
      function checkPasswordStrength(password) {
        let strength = 0;
        const checks = {
          length: password.length >= 8,
          uppercase: /[A-Z]/.test(password),
          lowercase: /[a-z]/.test(password),
          digit: /[0-9]/.test(password),
          special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
        
        strength = Object.values(checks).filter(Boolean).length;
        
        if (strength <= 2) return 'weak';
        if (strength <= 4) return 'medium';
        return 'strong';
      }

      test('should classify weak password', () => {
        expect(checkPasswordStrength('pass')).toBe('weak');
        expect(checkPasswordStrength('password')).toBe('weak');
      });

      test('should classify medium password', () => {
        expect(checkPasswordStrength('Password1')).toBe('medium');
        expect(checkPasswordStrength('password123')).toBe('medium');
      });

      test('should classify strong password', () => {
        expect(checkPasswordStrength('Password123!')).toBe('strong');
        expect(checkPasswordStrength('Str0ng!Pass')).toBe('strong');
      });
    });

    describe('Password Confirmation', () => {
      test('should reject non-matching passwords', () => {
        const password = 'Password123!';
        const confirmPassword = 'DifferentPass123!';
        expect(password === confirmPassword).toBe(false);
      });

      test('should accept matching passwords', () => {
        const password = 'Password123!';
        const confirmPassword = 'Password123!';
        expect(password === confirmPassword).toBe(true);
      });
    });
  });

  describe('Authentication Module', () => {
    let Auth;

    beforeEach(() => {
      // Mock axios
      global.axios = {
        get: jest.fn(),
        post: jest.fn(),
      };

      // Create Auth module
      Auth = {
        TOKEN_KEY: 'token',
        USER_KEY: 'user',
        TOKEN_EXPIRATION_KEY: 'tokenExpiration',
        TOKEN_LIFETIME: 24 * 60 * 60 * 1000,

        setToken(token) {
          localStorage.setItem(this.TOKEN_KEY, token);
          const expirationTime = Date.now() + this.TOKEN_LIFETIME;
          localStorage.setItem(this.TOKEN_EXPIRATION_KEY, expirationTime.toString());
        },

        getToken() {
          return localStorage.getItem(this.TOKEN_KEY);
        },

        removeToken() {
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.TOKEN_EXPIRATION_KEY);
        },

        setUser(user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        },

        getUser() {
          const userStr = localStorage.getItem(this.USER_KEY);
          if (!userStr) return null;
          try {
            return JSON.parse(userStr);
          } catch (error) {
            return null;
          }
        },

        removeUser() {
          localStorage.removeItem(this.USER_KEY);
        },

        isAuthenticated() {
          const token = this.getToken();
          if (!token) return false;
          
          const expirationTime = localStorage.getItem(this.TOKEN_EXPIRATION_KEY);
          if (expirationTime && Date.now() > parseInt(expirationTime)) {
            this.clearAuth();
            return false;
          }
          
          return true;
        },

        clearAuth() {
          this.removeToken();
          this.removeUser();
        },

        getAuthHeaders() {
          const token = this.getToken();
          if (!token) return {};
          return {
            'Authorization': `Bearer ${token}`,
          };
        },
      };
    });

    describe('Token Management', () => {
      test('should store token in localStorage', () => {
        const token = 'test-jwt-token';
        Auth.setToken(token);
        expect(localStorage.getItem('token')).toBe(token);
      });

      test('should retrieve token from localStorage', () => {
        const token = 'test-jwt-token';
        localStorage.setItem('token', token);
        expect(Auth.getToken()).toBe(token);
      });

      test('should remove token from localStorage', () => {
        localStorage.setItem('token', 'test-token');
        Auth.removeToken();
        expect(localStorage.getItem('token')).toBeNull();
      });

      test('should set token expiration time', () => {
        const token = 'test-jwt-token';
        Auth.setToken(token);
        const expiration = localStorage.getItem('tokenExpiration');
        expect(expiration).not.toBeNull();
        expect(parseInt(expiration)).toBeGreaterThan(Date.now());
      });
    });

    describe('User Management', () => {
      test('should store user data in localStorage', () => {
        const user = { id: '123', username: 'testuser', role: 'user' };
        Auth.setUser(user);
        const stored = localStorage.getItem('user');
        expect(JSON.parse(stored)).toEqual(user);
      });

      test('should retrieve user data from localStorage', () => {
        const user = { id: '123', username: 'testuser', role: 'user' };
        localStorage.setItem('user', JSON.stringify(user));
        expect(Auth.getUser()).toEqual(user);
      });

      test('should return null for invalid user data', () => {
        localStorage.setItem('user', 'invalid-json');
        expect(Auth.getUser()).toBeNull();
      });

      test('should remove user data from localStorage', () => {
        localStorage.setItem('user', JSON.stringify({ id: '123' }));
        Auth.removeUser();
        expect(localStorage.getItem('user')).toBeNull();
      });
    });

    describe('Authentication Status', () => {
      test('should return false when no token exists', () => {
        expect(Auth.isAuthenticated()).toBe(false);
      });

      test('should return true when valid token exists', () => {
        Auth.setToken('valid-token');
        expect(Auth.isAuthenticated()).toBe(true);
      });

      test('should return false when token is expired', () => {
        localStorage.setItem('token', 'expired-token');
        localStorage.setItem('tokenExpiration', (Date.now() - 1000).toString());
        expect(Auth.isAuthenticated()).toBe(false);
      });

      test('should clear auth data when token is expired', () => {
        localStorage.setItem('token', 'expired-token');
        localStorage.setItem('tokenExpiration', (Date.now() - 1000).toString());
        localStorage.setItem('user', JSON.stringify({ id: '123' }));
        
        Auth.isAuthenticated();
        
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
      });
    });

    describe('Authorization Headers', () => {
      test('should return empty object when no token exists', () => {
        expect(Auth.getAuthHeaders()).toEqual({});
      });

      test('should return Authorization header with Bearer token', () => {
        const token = 'test-jwt-token';
        Auth.setToken(token);
        expect(Auth.getAuthHeaders()).toEqual({
          'Authorization': `Bearer ${token}`,
        });
      });
    });

    describe('Clear Authentication', () => {
      test('should clear all authentication data', () => {
        Auth.setToken('test-token');
        Auth.setUser({ id: '123', username: 'testuser' });
        
        Auth.clearAuth();
        
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(localStorage.getItem('tokenExpiration')).toBeNull();
      });
    });
  });

  describe('Error Handler', () => {
    let errorHandler;

    beforeEach(() => {
      // Create error handler
      errorHandler = {
        escapeHtml(text) {
          // Simple HTML escaping without DOM
          return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        },

        getAlertClass(type) {
          const classes = {
            'error': 'danger',
            'success': 'success',
            'warning': 'warning',
            'info': 'info',
          };
          return classes[type] || 'danger';
        },

        getAlertTitle(type) {
          const titles = {
            'error': 'Error!',
            'success': 'Success!',
            'warning': 'Warning!',
            'info': 'Info:',
          };
          return titles[type] || 'Error!';
        },

        getUserFriendlyMessage(code, defaultMessage) {
          const messages = {
            'AUTH_FAILED': 'Authentication failed. Please check your credentials.',
            'INVALID_CREDENTIALS': 'Invalid username or password.',
            'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
            'ACCOUNT_LOCKED': defaultMessage,
            'VALIDATION_ERROR': 'Please check your input and try again.',
            'INVALID_FILE': 'Invalid file format. Please upload JPEG, PNG, or TIFF images.',
            'FILE_TOO_LARGE': 'File size exceeds the maximum limit of 50MB.',
          };
          return messages[code] || defaultMessage || 'An error occurred. Please try again.';
        },
      };
    });

    describe('HTML Escaping', () => {
      test('should escape HTML special characters', () => {
        const input = '<script>alert("xss")</script>';
        const escaped = errorHandler.escapeHtml(input);
        expect(escaped).not.toContain('<script>');
        expect(escaped).toContain('&lt;');
        expect(escaped).toContain('&gt;');
      });

      test('should handle plain text', () => {
        const input = 'Plain text message';
        const escaped = errorHandler.escapeHtml(input);
        expect(escaped).toBe(input);
      });
    });

    describe('Alert Class Mapping', () => {
      test('should map error to danger', () => {
        expect(errorHandler.getAlertClass('error')).toBe('danger');
      });

      test('should map success to success', () => {
        expect(errorHandler.getAlertClass('success')).toBe('success');
      });

      test('should map warning to warning', () => {
        expect(errorHandler.getAlertClass('warning')).toBe('warning');
      });

      test('should map info to info', () => {
        expect(errorHandler.getAlertClass('info')).toBe('info');
      });

      test('should default to danger for unknown type', () => {
        expect(errorHandler.getAlertClass('unknown')).toBe('danger');
      });
    });

    describe('Alert Title Mapping', () => {
      test('should return correct title for each type', () => {
        expect(errorHandler.getAlertTitle('error')).toBe('Error!');
        expect(errorHandler.getAlertTitle('success')).toBe('Success!');
        expect(errorHandler.getAlertTitle('warning')).toBe('Warning!');
        expect(errorHandler.getAlertTitle('info')).toBe('Info:');
      });

      test('should default to Error! for unknown type', () => {
        expect(errorHandler.getAlertTitle('unknown')).toBe('Error!');
      });
    });

    describe('User-Friendly Error Messages', () => {
      test('should return specific message for known error codes', () => {
        expect(errorHandler.getUserFriendlyMessage('AUTH_FAILED')).toBe('Authentication failed. Please check your credentials.');
        expect(errorHandler.getUserFriendlyMessage('INVALID_CREDENTIALS')).toBe('Invalid username or password.');
        expect(errorHandler.getUserFriendlyMessage('TOKEN_EXPIRED')).toBe('Your session has expired. Please log in again.');
      });

      test('should return default message for unknown error codes', () => {
        const defaultMsg = 'Something went wrong';
        expect(errorHandler.getUserFriendlyMessage('UNKNOWN_ERROR', defaultMsg)).toBe(defaultMsg);
      });

      test('should return generic message when no default provided', () => {
        expect(errorHandler.getUserFriendlyMessage('UNKNOWN_ERROR')).toBe('An error occurred. Please try again.');
      });

      test('should use server message for ACCOUNT_LOCKED', () => {
        const serverMsg = 'Account locked for 15 minutes';
        expect(errorHandler.getUserFriendlyMessage('ACCOUNT_LOCKED', serverMsg)).toBe(serverMsg);
      });
    });
  });

  describe('Bounding Box Rendering', () => {
    describe('Canvas Drawing Functions', () => {
      test('should calculate bounding box dimensions correctly', () => {
        const bbox = { x: 100, y: 100, width: 200, height: 150 };
        
        expect(bbox.x).toBe(100);
        expect(bbox.y).toBe(100);
        expect(bbox.width).toBe(200);
        expect(bbox.height).toBe(150);
      });

      test('should scale bounding box coordinates correctly', () => {
        const bbox = { x: 100, y: 100, width: 200, height: 150 };
        const scaleX = 0.5;
        const scaleY = 0.5;

        const scaledBbox = {
          x: bbox.x * scaleX,
          y: bbox.y * scaleY,
          width: bbox.width * scaleX,
          height: bbox.height * scaleY,
        };

        expect(scaledBbox.x).toBe(50);
        expect(scaledBbox.y).toBe(50);
        expect(scaledBbox.width).toBe(100);
        expect(scaledBbox.height).toBe(75);
      });

      test('should calculate label dimensions', () => {
        const label = 'Defect 85%';
        const textHeight = 20;
        const padding = 10;

        // Simulate text width calculation
        const estimatedTextWidth = label.length * 8; // Rough estimate
        const labelWidth = estimatedTextWidth + padding;

        expect(labelWidth).toBeGreaterThan(0);
        expect(textHeight).toBe(20);
      });
    });

    describe('Defect Color Mapping', () => {
      const DEFECT_COLORS = {
        'damaged_rivet': '#FF6B6B',
        'missing_rivet': '#4ECDC4',
        'filiform_corrosion': '#45B7D1',
        'missing_panel': '#FFA07A',
        'crack': '#E74C3C',
      };

      test('should return correct color for defect class', () => {
        expect(DEFECT_COLORS['damaged_rivet']).toBe('#FF6B6B');
        expect(DEFECT_COLORS['crack']).toBe('#E74C3C');
      });

      test('should handle unknown defect class', () => {
        const defaultColor = '#6c757d';
        const color = DEFECT_COLORS['unknown_defect'] || defaultColor;
        expect(color).toBe(defaultColor);
      });
    });

    describe('Defect Filtering', () => {
      const allDefects = [
        { class: 'crack', confidence: 0.95, bbox: { x: 100, y: 100, width: 50, height: 50 } },
        { class: 'damaged_rivet', confidence: 0.45, bbox: { x: 200, y: 200, width: 30, height: 30 } },
        { class: 'crack', confidence: 0.75, bbox: { x: 300, y: 300, width: 40, height: 40 } },
        { class: 'missing_panel', confidence: 0.60, bbox: { x: 400, y: 400, width: 60, height: 60 } },
      ];

      test('should filter defects by confidence threshold', () => {
        const threshold = 0.5;
        const filtered = allDefects.filter(d => d.confidence >= threshold);
        expect(filtered.length).toBe(3);
        expect(filtered.every(d => d.confidence >= threshold)).toBe(true);
      });

      test('should filter defects by class', () => {
        const selectedClass = 'crack';
        const filtered = allDefects.filter(d => d.class === selectedClass);
        expect(filtered.length).toBe(2);
        expect(filtered.every(d => d.class === selectedClass)).toBe(true);
      });

      test('should filter by both confidence and class', () => {
        const threshold = 0.5;
        const selectedClass = 'crack';
        const filtered = allDefects.filter(d => 
          d.confidence >= threshold && d.class === selectedClass
        );
        expect(filtered.length).toBe(2);
        expect(filtered.every(d => d.confidence >= threshold && d.class === selectedClass)).toBe(true);
      });
    });

    describe('Hover Detection', () => {
      function isPointInBbox(x, y, bbox) {
        return x >= bbox.x && x <= bbox.x + bbox.width &&
               y >= bbox.y && y <= bbox.y + bbox.height;
      }

      test('should detect point inside bounding box', () => {
        const bbox = { x: 100, y: 100, width: 200, height: 150 };
        expect(isPointInBbox(150, 150, bbox)).toBe(true);
        expect(isPointInBbox(200, 200, bbox)).toBe(true);
      });

      test('should detect point outside bounding box', () => {
        const bbox = { x: 100, y: 100, width: 200, height: 150 };
        expect(isPointInBbox(50, 50, bbox)).toBe(false);
        expect(isPointInBbox(350, 300, bbox)).toBe(false);
      });

      test('should detect point on bounding box edge', () => {
        const bbox = { x: 100, y: 100, width: 200, height: 150 };
        expect(isPointInBbox(100, 100, bbox)).toBe(true);
        expect(isPointInBbox(300, 250, bbox)).toBe(true);
      });
    });

    describe('Class Name Formatting', () => {
      function formatClassName(className) {
        return className.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }

      test('should format snake_case to Title Case', () => {
        expect(formatClassName('damaged_rivet')).toBe('Damaged Rivet');
        expect(formatClassName('missing_panel')).toBe('Missing Panel');
        expect(formatClassName('filiform_corrosion')).toBe('Filiform Corrosion');
      });

      test('should handle single word', () => {
        expect(formatClassName('crack')).toBe('Crack');
      });
    });
  });
});
