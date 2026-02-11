const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Determine storage type based on environment
const USE_S3 = process.env.USE_S3 === 'true' && process.env.AWS_S3_BUCKET;

// Initialize S3 client if using S3
let s3Client = null;
if (USE_S3) {
    s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
    logger.info('S3 storage configured');
} else {
    // Ensure local uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    logger.info('Local storage configured');
}

/**
 * Upload file to S3 or local storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Unique filename
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>} - File URL
 */
const uploadFile = async (fileBuffer, filename, mimetype) => {
    try {
        if (USE_S3) {
            // Upload to S3
            const upload = new Upload({
                client: s3Client,
                params: {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `inspections/${filename}`,
                    Body: fileBuffer,
                    ContentType: mimetype,
                },
            });

            await upload.done();

            // Return S3 URL
            const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/inspections/${filename}`;
            logger.info(`File uploaded to S3: ${filename}`);
            return url;
        } else {
            // Save to local storage
            const uploadsDir = path.join(__dirname, '../../uploads');
            const filePath = path.join(uploadsDir, filename);

            fs.writeFileSync(filePath, fileBuffer);

            // Return local URL
            const url = `/uploads/${filename}`;
            logger.info(`File saved locally: ${filename}`);
            return url;
        }
    } catch (error) {
        logger.error('File upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
};

/**
 * Delete file from S3 or local storage
 * @param {string} fileUrl - File URL
 * @returns {Promise<void>}
 */
const deleteFile = async (fileUrl) => {
    try {
        if (USE_S3) {
            // Extract key from S3 URL
            const key = fileUrl.split('.amazonaws.com/')[1];

            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
            }));

            logger.info(`File deleted from S3: ${key}`);
        } else {
            // Delete from local storage
            const filename = path.basename(fileUrl);
            const filePath = path.join(__dirname, '../../uploads', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`File deleted locally: ${filename}`);
            }
        }
    } catch (error) {
        logger.error('File deletion error:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
};

module.exports = {
    uploadFile,
    deleteFile,
    USE_S3,
};