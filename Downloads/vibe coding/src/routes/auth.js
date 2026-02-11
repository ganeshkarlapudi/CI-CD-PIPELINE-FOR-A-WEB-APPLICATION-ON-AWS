const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { storeSessionToken, blacklistToken } = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();

// Apply stricter rate limiting to auth endpoints
router.use(authLimiter);

// POST /api/auth/register - User registration
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username is already registered',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email is already registered',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'user', // Default role
    });

    await newUser.save();

    logger.info(`New user registered: ${username}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: newUser._id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Registration error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/login - User login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockoutMinutes = Math.ceil((user.lockoutUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is locked due to multiple failed login attempts. Please try again in ${lockoutMinutes} minutes.`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if account is inactive
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account has been deactivated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incrementLoginAttempts();

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Reset failed login attempts on successful login
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRATION || '24h',
      }
    );

    // Store session token in Redis cache
    await storeSessionToken(token, {
      userId: user._id,
      username: user.username,
      role: user.role,
    });

    logger.info(`User logged in: ${username}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Login error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Failed to login',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.token;

    // Add token to blacklist with 24-hour expiration
    const expirationSeconds = 24 * 60 * 60; // 24 hours
    await blacklistToken(token, expirationSeconds);

    logger.info(`User logged out: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Logout error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    valid: true,
    user: {
      id: req.user.userId,
      username: req.user.username,
      role: req.user.role,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// OTP-BASED PASSWORD RECOVERY ENDPOINTS
// ============================================

// POST /api/auth/forgot-password - Request password reset OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_REQUIRED',
          message: 'Email is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // For security, don't reveal if email exists or not
    if (!user) {
      // Still return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate 6-digit OTP
    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();

    // Set OTP and expiration (10 minutes)
    user.passwordResetOTP = otp;
    user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP via email
    try {
      const { sendOTPEmail } = require('../utils/email');
      await sendOTPEmail(email, otp);
      logger.info(`Password Reset OTP sent to ${email}`);
    } catch (emailError) {
      // If email fails, log OTP to console as fallback
      logger.error(`Failed to send email to ${email}, showing OTP in console:`, emailError);
      console.log(`\n========================================`);
      console.log(`PASSWORD RESET OTP (Email Failed)`);
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires in: 10 minutes`);
      console.log(`========================================\n`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      // For development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { devOTP: otp }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Forgot password error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'FORGOT_PASSWORD_FAILED',
        message: 'Failed to process password reset request',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/verify-otp - Verify OTP and generate reset token
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email and OTP are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if OTP matches and hasn't expired
    if (user.passwordResetOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!user.passwordResetOTPExpires || user.passwordResetOTPExpires < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OTP_EXPIRED',
          message: 'OTP has expired. Please request a new one',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store reset token with 1-hour expiration
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Clear OTP after successful verification
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;

    await user.save();

    logger.info(`OTP verified for ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Verify OTP error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFY_OTP_FAILED',
        message: 'Failed to verify OTP',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/reset-password - Reset password with reset token
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Reset token and new password are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: resetToken,
      passwordResetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save();

    logger.info(`Password reset successful for user: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Reset password error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_PASSWORD_FAILED',
        message: 'Failed to reset password',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/resend-otp - Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_REQUIRED',
          message: 'Email is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a new OTP has been sent',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate new 6-digit OTP
    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();


    // Update OTP and expiration
    user.passwordResetOTP = otp;
    user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP via email
    try {
      const { sendOTPEmail } = require('../utils/email');
      await sendOTPEmail(email, otp);
      logger.info(`Resent Password Reset OTP to ${email}`);
    } catch (emailError) {
      // If email fails, log OTP to console as fallback
      logger.error(`Failed to resend email to ${email}, showing OTP in console:`, emailError);
      console.log(`\n========================================`);
      console.log(`RESENT PASSWORD RESET OTP (Email Failed)`);
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires in: 10 minutes`);
      console.log(`========================================\n`);
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
      // For development only
      ...(process.env.NODE_ENV === 'development' && { devOTP: otp }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Resend OTP error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'RESEND_OTP_FAILED',
        message: 'Failed to resend OTP',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
