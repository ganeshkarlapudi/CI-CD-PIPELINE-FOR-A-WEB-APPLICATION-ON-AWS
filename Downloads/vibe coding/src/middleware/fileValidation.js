const logger = require('../config/logger');

/**
 * Magic numbers (file signatures) for allowed image types
 */
const FILE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/tiff': [
    [0x49, 0x49, 0x2A, 0x00], // TIFF (little-endian)
    [0x4D, 0x4D, 0x00, 0x2A], // TIFF (big-endian)
  ],
};

/**
 * Validate file using magic number (file signature)
 * This prevents file type spoofing by checking actual file content
 */
const validateFileMagicNumber = (buffer, mimetype) => {
  const signatures = FILE_SIGNATURES[mimetype];
  
  if (!signatures) {
    return false;
  }
  
  // Check if buffer matches any of the signatures for this mimetype
  return signatures.some(signature => {
    // Check if buffer is long enough
    if (buffer.length < signature.length) {
      return false;
    }
    
    // Compare bytes
    return signature.every((byte, index) => buffer[index] === byte);
  });
};

/**
 * Middleware to validate uploaded files
 * Performs magic number validation and additional security checks
 */
const validateUploadedFiles = (req, res, next) => {
  // Skip if no files uploaded
  if (!req.files || req.files.length === 0) {
    return next();
  }
  
  const invalidFiles = [];
  
  // Validate each file
  for (const file of req.files) {
    // Check magic number
    const isValidMagicNumber = validateFileMagicNumber(file.buffer, file.mimetype);
    
    if (!isValidMagicNumber) {
      logger.warn(`Invalid file signature detected: ${file.originalname} (claimed type: ${file.mimetype})`);
      invalidFiles.push({
        filename: file.originalname,
        reason: 'Invalid file signature. File type does not match content.',
      });
      continue;
    }
    
    // Additional validation: Check file extension matches mimetype
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const expectedExtensions = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/tiff': ['tif', 'tiff'],
    };
    
    const validExtensions = expectedExtensions[file.mimetype] || [];
    if (!validExtensions.includes(fileExtension)) {
      logger.warn(`File extension mismatch: ${file.originalname} (type: ${file.mimetype}, extension: ${fileExtension})`);
      invalidFiles.push({
        filename: file.originalname,
        reason: `File extension .${fileExtension} does not match file type ${file.mimetype}`,
      });
      continue;
    }
    
    // Check for suspicious filenames
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      logger.warn(`Suspicious filename detected: ${file.originalname}`);
      invalidFiles.push({
        filename: file.originalname,
        reason: 'Filename contains invalid characters',
      });
      continue;
    }
  }
  
  // If any files are invalid, reject the request
  if (invalidFiles.length > 0) {
    // Remove all files from request
    req.files = [];
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILES',
        message: 'One or more files failed security validation',
        details: invalidFiles,
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  logger.debug(`File validation passed for ${req.files.length} file(s)`);
  next();
};

/**
 * Validate file dimensions and quality
 * This is a secondary validation that can be used after initial upload
 */
const validateImageDimensions = (width, height) => {
  const minDimension = parseInt(process.env.MIN_IMAGE_DIMENSION || '640');
  const maxDimension = parseInt(process.env.MAX_IMAGE_DIMENSION || '4096');
  
  if (width < minDimension || height < minDimension) {
    return {
      valid: false,
      message: `Image dimensions too small. Minimum: ${minDimension}x${minDimension}`,
    };
  }
  
  if (width > maxDimension || height > maxDimension) {
    return {
      valid: false,
      message: `Image dimensions too large. Maximum: ${maxDimension}x${maxDimension}`,
    };
  }
  
  return { valid: true };
};

/**
 * Check if file size is within limits
 */
const validateFileSize = (size) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default
  
  if (size > maxSize) {
    return {
      valid: false,
      message: `File size exceeds maximum limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }
  
  return { valid: true };
};

module.exports = {
  validateUploadedFiles,
  validateFileMagicNumber,
  validateImageDimensions,
  validateFileSize,
};
