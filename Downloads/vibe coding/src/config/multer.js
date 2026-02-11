const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/tiff').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // Default 50MB
    files: 10, // Maximum 10 files per request
  },
});

module.exports = upload;
