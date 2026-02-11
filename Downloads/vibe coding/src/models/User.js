const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must not exceed 30 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: 'Invalid email format',
    },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin'],
      message: '{VALUE} is not a valid role',
    },
    default: 'user',
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: '{VALUE} is not a valid status',
    },
    default: 'active',
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  lockoutUntil: {
    type: Date,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  // Password reset fields
  passwordResetOTP: {
    type: String,
    default: null,
  },
  passwordResetOTPExpires: {
    type: Date,
    default: null,
  },
  passwordResetToken: {
    type: String,
    default: null,
  },
  passwordResetTokenExpires: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for performance
// Note: username and email already have unique indexes from schema definition
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

// Method to increment failed login attempts
userSchema.methods.incrementLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockoutUntil: 1 },
    });
  }

  // Otherwise increment
  const updates = { $inc: { failedLoginAttempts: 1 } };

  // Lock the account if we've reached max attempts (5)
  if (this.failedLoginAttempts + 1 >= 5) {
    updates.$set = { lockoutUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutes
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { failedLoginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockoutUntil: 1 },
  });
};

module.exports = mongoose.model('User', userSchema);
