# Configuration Guide

This document provides detailed information about configuring the Aircraft Defect Detection System for different environments.

## Table of Contents

- [Overview](#overview)
- [Configuration Files](#configuration-files)
- [Environment Variables Reference](#environment-variables-reference)
- [Configuration by Environment](#configuration-by-environment)
- [Security Configuration](#security-configuration)
- [Database Configuration](#database-configuration)
- [Storage Configuration](#storage-configuration)
- [ML Service Configuration](#ml-service-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The application uses environment variables for configuration, supporting three deployment scenarios:

1. **Local Development** - Run services locally for development
2. **Docker Deployment** - Containerized deployment with Docker Compose
3. **Production Deployment** - Cloud-based production environment

## Configuration Files

| File | Purpose | Use Case |
|------|---------|----------|
| `.env.example` | Template with all variables and documentation | Reference and initial setup |
| `.env.development` | Development configuration | Local development |
| `.env.production` | Production configuration | Production deployment |
| `.env.docker` | Docker configuration | Docker Compose deployment |
| `.env` | Active configuration (gitignored) | Runtime configuration |

### Setup Instructions

```bash
# For local development
cp .env.development .env
# Edit .env and add your OPENAI_API_KEY

# For Docker
cp .env.docker .env
# Edit .env and add your OPENAI_API_KEY

# For production
cp .env.production .env
# Edit .env and update ALL secrets and credentials
```

## Environment Variables Reference

### Application Configuration

#### NODE_ENV
- **Type**: String
- **Values**: `development`, `production`, `test`
- **Default**: `development`
- **Description**: Determines the application environment mode
- **Impact**: Affects logging, error handling, and security settings

#### PORT
- **Type**: Number
- **Default**: `3000`
- **Description**: Port number for the backend server
- **Example**: `3000`, `8080`

#### APP_BASE_URL
- **Type**: String
- **Required**: Yes
- **Description**: Base URL for the application (used in emails, redirects)
- **Example**: `http://localhost:3000`, `https://yourdomain.com`

### Database Configuration

#### MONGODB_URI
- **Type**: String (Connection URL)
- **Required**: Yes
- **Description**: MongoDB connection string
- **Examples**:
  - Local: `mongodb://localhost:27017/aircraft_detection`
  - Docker: `mongodb://mongo:27017/aircraft_detection`
  - Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/aircraft_detection`
- **Notes**: Include authentication credentials if required

#### MONGO_POOL_SIZE
- **Type**: Number
- **Default**: `100`
- **Description**: Maximum number of connections in the connection pool
- **Recommendation**: 50 for development, 100+ for production

#### MONGO_CONNECT_TIMEOUT_MS
- **Type**: Number (milliseconds)
- **Default**: `10000`
- **Description**: Timeout for initial connection to MongoDB

#### REDIS_URL
- **Type**: String (Connection URL)
- **Required**: Yes
- **Description**: Redis connection string
- **Examples**:
  - Local: `redis://localhost:6379`
  - Docker: `redis://redis:6379`
  - Cloud: `redis://:password@host:port`

#### REDIS_SESSION_TTL
- **Type**: Number (seconds)
- **Default**: `86400` (24 hours)
- **Description**: Time-to-live for session data in Redis

### Authentication & Security

#### JWT_SECRET
- **Type**: String
- **Required**: Yes
- **Description**: Secret key for signing JWT tokens
- **Security**: MUST be changed in production
- **Generation**: `openssl rand -base64 64`
- **Length**: Minimum 32 characters recommended

#### JWT_EXPIRATION
- **Type**: String (time span)
- **Default**: `24h`
- **Description**: JWT token expiration time
- **Format**: `60s`, `5m`, `2h`, `7d`

#### JWT_REFRESH_EXPIRATION
- **Type**: String (time span)
- **Default**: `7d`
- **Description**: Refresh token expiration time

#### BCRYPT_SALT_ROUNDS
- **Type**: Number
- **Default**: `10`
- **Description**: Number of salt rounds for bcrypt password hashing
- **Recommendation**: 10 for development, 12 for production
- **Note**: Higher values increase security but slow down hashing

#### MAX_LOGIN_ATTEMPTS
- **Type**: Number
- **Default**: `5`
- **Description**: Maximum failed login attempts before account lockout

#### LOCKOUT_DURATION_MINUTES
- **Type**: Number
- **Default**: `15`
- **Description**: Account lockout duration after max failed attempts

### Storage Configuration

#### USE_LOCAL_STORAGE
- **Type**: Boolean
- **Default**: `true`
- **Description**: Use local filesystem (true) or AWS S3 (false)
- **Recommendation**: `true` for development, `false` for production

#### UPLOAD_DIR
- **Type**: String (path)
- **Default**: `./uploads`
- **Description**: Directory for local file uploads
- **Note**: Only used when `USE_LOCAL_STORAGE=true`

#### AWS_S3_BUCKET
- **Type**: String
- **Required**: When `USE_LOCAL_STORAGE=false`
- **Description**: AWS S3 bucket name for image storage
- **Example**: `aircraft-images-prod`

#### AWS_ACCESS_KEY_ID
- **Type**: String
- **Required**: When using S3
- **Description**: AWS IAM access key ID
- **Security**: Keep confidential, use IAM roles when possible

#### AWS_SECRET_ACCESS_KEY
- **Type**: String
- **Required**: When using S3
- **Description**: AWS IAM secret access key
- **Security**: Keep confidential, never commit to version control

#### AWS_REGION
- **Type**: String
- **Default**: `us-east-1`
- **Description**: AWS region for S3 bucket
- **Examples**: `us-east-1`, `eu-west-1`, `ap-southeast-1`

### OpenAI Configuration

#### OPENAI_API_KEY
- **Type**: String
- **Required**: Yes
- **Description**: OpenAI API key for GPT Vision API
- **Obtain**: https://platform.openai.com/api-keys
- **Security**: Keep confidential, monitor usage

#### GPT_VISION_MODEL
- **Type**: String
- **Default**: `gpt-4-vision-preview`
- **Description**: GPT Vision model to use
- **Options**: `gpt-4-vision-preview`, `gpt-4-turbo`

#### GPT_VISION_MAX_TOKENS
- **Type**: Number
- **Default**: `1000`
- **Description**: Maximum tokens for GPT Vision response

#### GPT_VISION_TEMPERATURE
- **Type**: Number (0.0 - 2.0)
- **Default**: `0.2`
- **Description**: Sampling temperature for GPT Vision
- **Note**: Lower values (0.2) for more deterministic outputs

#### OPENAI_MONTHLY_BUDGET
- **Type**: Number (USD)
- **Default**: `100`
- **Description**: Monthly budget limit for OpenAI API usage

#### OPENAI_ALERT_THRESHOLD
- **Type**: Number (percentage)
- **Default**: `80`
- **Description**: Alert when usage reaches this percentage of budget

### ML Service Configuration

#### ML_SERVICE_URL
- **Type**: String (URL)
- **Required**: Yes
- **Description**: URL of the Python ML inference service
- **Examples**:
  - Local: `http://localhost:5000`
  - Docker: `http://ml-service:5000`
  - Production: `https://ml.yourdomain.com`

#### FLASK_ENV
- **Type**: String
- **Values**: `development`, `production`
- **Default**: `development`
- **Description**: Flask environment mode

#### ML_SERVICE_PORT
- **Type**: Number
- **Default**: `5000`
- **Description**: Port for ML service

#### ML_SERVICE_TIMEOUT
- **Type**: Number (milliseconds)
- **Default**: `30000`
- **Description**: Timeout for ML service requests

### YOLO Configuration

#### YOLO_MODEL_PATH
- **Type**: String (path)
- **Required**: Yes
- **Description**: Path to YOLOv8 model weights file
- **Options**:
  - `yolov8n.pt` - Nano (fastest, least accurate)
  - `yolov8s.pt` - Small
  - `yolov8m.pt` - Medium (recommended for production)
  - `yolov8l.pt` - Large (most accurate, slowest)
- **Example**: `./ml-service/models/yolov8n.pt`

#### YOLO_CONFIDENCE_THRESHOLD
- **Type**: Number (0.0 - 1.0)
- **Default**: `0.5`
- **Description**: Minimum confidence score for detections
- **Recommendation**: 0.5 for balanced precision/recall

#### YOLO_NMS_IOU_THRESHOLD
- **Type**: Number (0.0 - 1.0)
- **Default**: `0.45`
- **Description**: IoU threshold for Non-Maximum Suppression

#### YOLO_IMAGE_SIZE
- **Type**: Number (pixels)
- **Default**: `640`
- **Description**: Input image size for YOLO inference
- **Options**: `640`, `1280` (higher = more accurate but slower)

#### YOLO_DEVICE
- **Type**: String
- **Default**: `cpu`
- **Description**: Device for YOLO inference
- **Options**: `cpu`, `cuda` (NVIDIA GPU), `mps` (Apple Silicon)

### Ensemble Configuration

#### ENSEMBLE_YOLO_WEIGHT
- **Type**: Number (0.0 - 1.0)
- **Default**: `0.6`
- **Description**: Weight for YOLO predictions in ensemble
- **Note**: Must sum to 1.0 with GPT weight

#### ENSEMBLE_GPT_WEIGHT
- **Type**: Number (0.0 - 1.0)
- **Default**: `0.4`
- **Description**: Weight for GPT predictions in ensemble

#### NMS_IOU_THRESHOLD
- **Type**: Number (0.0 - 1.0)
- **Default**: `0.5`
- **Description**: IoU threshold for ensemble NMS

#### ENSEMBLE_MIN_CONFIDENCE
- **Type**: Number (0.0 - 1.0)
- **Default**: `0.5`
- **Description**: Minimum confidence for ensemble predictions

### File Upload Configuration

#### MAX_FILE_SIZE
- **Type**: Number (bytes)
- **Default**: `52428800` (50MB)
- **Description**: Maximum file size for uploads
- **Note**: Must match nginx/proxy limits

#### ALLOWED_FILE_TYPES
- **Type**: String (comma-separated MIME types)
- **Default**: `image/jpeg,image/png,image/tiff`
- **Description**: Allowed file MIME types for upload

#### MIN_IMAGE_DIMENSION
- **Type**: Number (pixels)
- **Default**: `640`
- **Description**: Minimum image width/height

#### MAX_IMAGE_DIMENSION
- **Type**: Number (pixels)
- **Default**: `4096`
- **Description**: Maximum image width/height

#### MAX_FILES_PER_UPLOAD
- **Type**: Number
- **Default**: `10`
- **Description**: Maximum number of files per upload request

### Security Configuration

#### CORS_ALLOWED_ORIGINS
- **Type**: String (comma-separated URLs)
- **Required**: Yes
- **Description**: Allowed origins for CORS
- **Examples**:
  - Development: `http://localhost:3000,http://127.0.0.1:3000`
  - Production: `https://yourdomain.com,https://www.yourdomain.com`
  - Allow all: `*` (NOT recommended for production)

#### CORS_ALLOW_CREDENTIALS
- **Type**: Boolean
- **Default**: `true`
- **Description**: Allow credentials in CORS requests

#### RATE_LIMIT_WINDOW_MS
- **Type**: Number (milliseconds)
- **Default**: `60000` (1 minute)
- **Description**: Time window for rate limiting

#### RATE_LIMIT_MAX_REQUESTS
- **Type**: Number
- **Default**: `100`
- **Description**: Maximum requests per window per IP

#### AUTH_RATE_LIMIT_WINDOW_MS
- **Type**: Number (milliseconds)
- **Default**: `900000` (15 minutes)
- **Description**: Time window for auth endpoint rate limiting

#### AUTH_RATE_LIMIT_MAX_REQUESTS
- **Type**: Number
- **Default**: `10`
- **Description**: Maximum auth requests per window

#### HELMET_ENABLED
- **Type**: Boolean
- **Default**: `true`
- **Description**: Enable Helmet.js security headers

#### CSP_ENABLED
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable Content Security Policy

### Logging Configuration

#### LOG_LEVEL
- **Type**: String
- **Default**: `info`
- **Description**: Logging level
- **Options**: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`
- **Recommendation**: `debug` for development, `info` for production

#### LOG_DIR
- **Type**: String (path)
- **Default**: `./logs`
- **Description**: Directory for log files

#### LOG_CONSOLE_ENABLED
- **Type**: Boolean
- **Default**: `true`
- **Description**: Enable console logging

#### LOG_CONSOLE_COLORIZE
- **Type**: Boolean
- **Default**: `true`
- **Description**: Colorize console logs

## Configuration by Environment

### Local Development

```bash
# Copy development config
cp .env.development .env

# Required changes:
# 1. Add your OpenAI API key
OPENAI_API_KEY=sk-your-key-here

# 2. (Optional) Change JWT secret
JWT_SECRET=$(openssl rand -base64 64)

# Start services
npm run dev
```

### Docker Deployment

```bash
# Copy Docker config
cp .env.docker .env

# Required changes:
# 1. Add your OpenAI API key
OPENAI_API_KEY=sk-your-key-here

# 2. Change secrets for production
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)

# Start with Docker Compose
docker-compose up -d
```

### Production Deployment

```bash
# Copy production config
cp .env.production .env

# Required changes:
# 1. Update all secrets
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)

# 2. Configure MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aircraft_detection

# 3. Configure Redis Cloud
REDIS_URL=redis://:password@host:port

# 4. Configure AWS S3
USE_LOCAL_STORAGE=false
AWS_S3_BUCKET=aircraft-images-prod
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# 5. Add OpenAI API key
OPENAI_API_KEY=sk-your-key-here

# 6. Update CORS origins
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# 7. Update base URL
APP_BASE_URL=https://yourdomain.com
```

## Security Configuration

### Generating Secrets

```bash
# Generate JWT secret (64 bytes)
openssl rand -base64 64

# Generate session secret (64 bytes)
openssl rand -base64 64

# Generate random password (32 bytes)
openssl rand -base64 32
```

### Security Checklist

- [ ] Change all default secrets (JWT_SECRET, SESSION_SECRET)
- [ ] Use strong MongoDB and Redis passwords
- [ ] Restrict CORS to specific domains
- [ ] Enable rate limiting
- [ ] Use HTTPS in production
- [ ] Enable Helmet.js security headers
- [ ] Set appropriate file size limits
- [ ] Configure proper logging levels
- [ ] Use environment-specific configurations
- [ ] Never commit .env files to version control

## Database Configuration

### MongoDB

#### Local MongoDB
```bash
MONGODB_URI=mongodb://localhost:27017/aircraft_detection
```

#### MongoDB with Authentication
```bash
MONGODB_URI=mongodb://username:password@localhost:27017/aircraft_detection?authSource=admin
```

#### MongoDB Atlas
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aircraft_detection?retryWrites=true&w=majority
```

#### Docker MongoDB
```bash
MONGODB_URI=mongodb://mongo:27017/aircraft_detection
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=admin123
```

### Redis

#### Local Redis
```bash
REDIS_URL=redis://localhost:6379
```

#### Redis with Password
```bash
REDIS_URL=redis://:password@localhost:6379
```

#### Redis Cloud
```bash
REDIS_URL=redis://:password@redis-host:port
```

## Storage Configuration

### Local Storage

```bash
USE_LOCAL_STORAGE=true
UPLOAD_DIR=./uploads
```

**Pros**: Simple, no external dependencies
**Cons**: Not scalable, files lost on container restart

### AWS S3 Storage

```bash
USE_LOCAL_STORAGE=false
AWS_S3_BUCKET=aircraft-images-prod
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

**Pros**: Scalable, durable, CDN integration
**Cons**: Requires AWS account, additional cost

### S3 IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::aircraft-images-prod/*",
        "arn:aws:s3:::aircraft-images-prod"
      ]
    }
  ]
}
```

## ML Service Configuration

### Model Selection

| Model | Speed | Accuracy | Use Case |
|-------|-------|----------|----------|
| yolov8n.pt | Fastest | Good | Development, testing |
| yolov8s.pt | Fast | Better | Light production |
| yolov8m.pt | Medium | Best | Production (recommended) |
| yolov8l.pt | Slow | Excellent | High-accuracy requirements |

### GPU Configuration

```bash
# For NVIDIA GPU
YOLO_DEVICE=cuda

# For Apple Silicon (M1/M2)
YOLO_DEVICE=mps

# For CPU only
YOLO_DEVICE=cpu
```

### Ensemble Tuning

Adjust weights based on model performance:

```bash
# Trust YOLO more (faster, local)
ENSEMBLE_YOLO_WEIGHT=0.7
ENSEMBLE_GPT_WEIGHT=0.3

# Trust GPT more (better context understanding)
ENSEMBLE_YOLO_WEIGHT=0.4
ENSEMBLE_GPT_WEIGHT=0.6

# Balanced (default)
ENSEMBLE_YOLO_WEIGHT=0.6
ENSEMBLE_GPT_WEIGHT=0.4
```

## Troubleshooting

### MongoDB Connection Issues

**Problem**: Cannot connect to MongoDB

**Solutions**:
1. Check MongoDB is running: `mongod --version`
2. Verify connection string format
3. Check authentication credentials
4. Ensure network access (firewall, security groups)
5. For Atlas: Whitelist IP address

### Redis Connection Issues

**Problem**: Cannot connect to Redis

**Solutions**:
1. Check Redis is running: `redis-cli ping`
2. Verify Redis URL format
3. Check password if required
4. Ensure Redis port is accessible

### OpenAI API Issues

**Problem**: GPT Vision API errors

**Solutions**:
1. Verify API key is valid
2. Check API quota and billing
3. Monitor rate limits
4. Verify model name is correct

### File Upload Issues

**Problem**: File uploads failing

**Solutions**:
1. Check `MAX_FILE_SIZE` setting
2. Verify `ALLOWED_FILE_TYPES` includes file type
3. Ensure upload directory exists and is writable
4. For S3: Verify AWS credentials and bucket permissions

### ML Service Issues

**Problem**: ML service not responding

**Solutions**:
1. Check ML service is running
2. Verify `ML_SERVICE_URL` is correct
3. Check model file exists at `YOLO_MODEL_PATH`
4. Verify Python dependencies are installed
5. Check ML service logs for errors

### Performance Issues

**Problem**: Slow response times

**Solutions**:
1. Increase `MONGO_POOL_SIZE`
2. Enable Redis caching
3. Use GPU for YOLO inference (`YOLO_DEVICE=cuda`)
4. Use smaller YOLO model (yolov8n.pt)
5. Adjust `YOLO_IMAGE_SIZE` (lower = faster)
6. Increase `ML_SERVICE_TIMEOUT`

## Additional Resources

- [MongoDB Connection String Format](https://docs.mongodb.com/manual/reference/connection-string/)
- [Redis Configuration](https://redis.io/topics/config)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
