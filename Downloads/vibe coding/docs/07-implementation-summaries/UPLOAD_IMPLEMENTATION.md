# Image Upload Implementation

## Overview
Implemented image upload and storage backend for aircraft inspection images.

## Features Implemented

### 1. Storage Configuration (`src/config/storage.js`)
- Supports both AWS S3 and local file storage
- Automatic fallback to local storage if S3 is not configured
- File upload and deletion functions
- Environment-based configuration

### 2. Multer Configuration (`src/config/multer.js`)
- Memory storage for file processing
- File type validation (JPEG, PNG, TIFF)
- File size limits (configurable, default 50MB)
- Support for multiple file uploads (up to 10 files)

### 3. Image Service (`src/services/imageService.js`)
- Image dimension validation (640px - 4096px)
- Unique filename generation using timestamps and random strings
- Image quality assessment
- Image processing and validation pipeline

### 4. Upload Endpoint (`src/routes/inspections.js`)
- **POST /api/inspections/upload** - Upload inspection images
  - Requires authentication
  - Accepts multiple images
  - Validates image dimensions and quality
  - Creates inspection records with "uploaded" status
  - Returns inspection IDs to client
- **GET /api/inspections/:id** - Retrieve inspection by ID
  - Requires authentication
  - Authorization check (owner or admin)

## Configuration

### Environment Variables
Add to your `.env` file:

```env
# Storage Configuration
USE_S3=false

# AWS S3 Configuration (set USE_S3=true to enable)
AWS_S3_BUCKET=aircraft-images
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# File Upload Configuration
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/tiff
```

### Required Dependencies
Install the following packages:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage sharp
```

## API Usage

### Upload Images
```bash
POST /api/inspections/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- images: [file1, file2, ...] (up to 10 files)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspections": [
      {
        "inspectionId": "507f1f77bcf86cd799439011",
        "filename": "aircraft-wing.jpg",
        "qualityScore": 85
      }
    ],
    "totalUploaded": 1,
    "totalFailed": 0
  },
  "message": "Successfully uploaded 1 image(s)",
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

## Validation Rules

### File Type
- Allowed: JPEG, PNG, TIFF
- Configurable via `ALLOWED_FILE_TYPES` environment variable

### File Size
- Maximum: 50MB (default)
- Configurable via `MAX_FILE_SIZE` environment variable

### Image Dimensions
- Minimum: 640x640 pixels
- Maximum: 4096x4096 pixels

### Image Quality
- Quality score calculated (0-100)
- Warning logged if quality < 60
- Upload still succeeds but quality score is returned

## Storage Options

### Local Storage (Default)
- Files stored in `uploads/` directory
- Accessible via `/uploads/<filename>`
- Automatically created if doesn't exist

### AWS S3 Storage
- Set `USE_S3=true` in environment
- Files stored in S3 bucket under `inspections/` prefix
- Returns S3 URL: `https://<bucket>.s3.<region>.amazonaws.com/inspections/<filename>`

## Requirements Satisfied
- ✅ 4.1 - Configure Multer middleware for file uploads
- ✅ 4.2 - Implement file validation (type, size, dimensions)
- ✅ 4.3 - Create POST /api/inspections/upload endpoint
- ✅ 4.4 - Set up AWS S3 client or local storage service
- ✅ 4.5 - Upload images to S3 with unique identifiers
- ✅ 4.5 - Create inspection records in MongoDB with "uploaded" status
- ✅ 4.5 - Return inspection IDs to client
