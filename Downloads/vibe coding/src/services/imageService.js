const sharp = require('sharp');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Validate image dimensions
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} - Image metadata
 */
const validateImageDimensions = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    
    const minDimension = 640;
    const maxDimension = 4096;
    
    if (metadata.width < minDimension || metadata.height < minDimension) {
      throw new Error(`Image dimensions too small. Minimum: ${minDimension}x${minDimension}px`);
    }
    
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      throw new Error(`Image dimensions too large. Maximum: ${maxDimension}x${maxDimension}px`);
    }
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (error) {
    logger.error('Image validation error:', error);
    throw error;
  }
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop().toLowerCase();
  return `${timestamp}-${randomString}.${extension}`;
};

/**
 * Process and validate uploaded image
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Processed file data
 */
const processUploadedImage = async (file) => {
  try {
    // Validate image dimensions
    const dimensions = await validateImageDimensions(file.buffer);
    
    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.originalname);
    
    return {
      buffer: file.buffer,
      filename: uniqueFilename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      dimensions: dimensions,
    };
  } catch (error) {
    logger.error('Image processing error:', error);
    throw error;
  }
};

/**
 * Calculate image quality score
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<number>} - Quality score (0-100)
 */
const calculateImageQuality = async (imageBuffer) => {
  try {
    const stats = await sharp(imageBuffer).stats();
    
    // Simple quality estimation based on sharpness and contrast
    // This is a basic implementation; more sophisticated methods could be used
    let qualityScore = 100;
    
    // Check if image is too dark or too bright
    const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    if (avgBrightness < 50 || avgBrightness > 200) {
      qualityScore -= 20;
    }
    
    // Check contrast
    const avgStdDev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
    if (avgStdDev < 30) {
      qualityScore -= 20;
    }
    
    return Math.max(0, Math.min(100, qualityScore));
  } catch (error) {
    logger.error('Quality calculation error:', error);
    return 50; // Default quality score on error
  }
};

module.exports = {
  validateImageDimensions,
  generateUniqueFilename,
  processUploadedImage,
  calculateImageQuality,
};
