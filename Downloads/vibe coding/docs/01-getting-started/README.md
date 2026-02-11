# Aircraft Defect Detection System

A full-stack web application that leverages deep learning models (YOLOv8 and GPT Vision API) to automate aircraft visual inspections, achieving 95% mean Average Precision (mAP) through ensemble model predictions.

## Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Image Upload**: Multi-file upload with drag-and-drop support
- **ML-Powered Detection**: Ensemble of YOLOv8 and GPT Vision API for defect detection
- **12 Defect Classes**: Damaged rivets, missing rivets, filiform corrosion, missing panels, paint detachment, scratches, composite damage, random damage, burn marks, scorch marks, metal fatigue, and cracks
- **Interactive Results**: Bounding box visualization with filtering and sorting
- **Report Generation**: Export inspection reports in PDF and JSON formats
- **Historical Analysis**: Track defect trends over time with visualizations
- **Admin Dashboard**: User management, model training, and system monitoring
- **Real-time Processing**: Async image analysis with status updates

## Technology Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Redis for caching
- JWT authentication
- AWS S3 for image storage

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5
- Chart.js for visualizations
- Axios for HTTP requests

### ML/AI
- Python Flask
- YOLOv8 (Ultralytics)
- OpenAI GPT-4 Vision API
- OpenCV for image preprocessing

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB 6.0+
- Redis 7.0+
- AWS account (for S3) or local storage
- OpenAI API key

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd aircraft-defect-detection
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and configure:
- MongoDB connection string
- Redis URL
- JWT secret
- AWS S3 credentials
- OpenAI API key
- ML service URL

### 4. Install Python ML service dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

### 5. Start MongoDB and Redis

```bash
# MongoDB
mongod --dbpath /path/to/data

# Redis
redis-server
```

## API Documentation

### Interactive Documentation
Access the Swagger UI documentation at:
```
http://localhost:3000/api-docs
```

### Documentation Files
- **Full API Documentation**: `API_DOCUMENTATION.md`
- **Quick Reference**: `API_QUICK_REFERENCE.md`
- **Postman Collection**: `postman_collection.json`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`

### Quick API Example
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"Pass@123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"Pass@123"}'

# Upload Image
curl -X POST http://localhost:3000/api/inspections/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@image.jpg"
```

## Running the Application

### Development Mode

**Backend:**
```bash
npm run dev
```

**ML Service:**
```bash
cd ml-service
python app.py
```

**Frontend:**
Open `frontend/login.html` in a browser or serve with a local server:
```bash
cd frontend
python -m http.server 8080
```

### Production Mode

```bash
npm start
```

## Docker Deployment (Recommended)

The easiest way to run the application is using Docker:

### Quick Start

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
start.bat
```

**Manual:**
```bash
# Copy environment file
cp .env.example .env

# Edit .env and set required variables (JWT_SECRET, OPENAI_API_KEY, etc.)

# Build and start services
docker-compose up -d

# Check service health
docker-compose ps
```

### Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **ML Service**: http://localhost:5000

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Check health
./health-check.sh

# Backup data
make backup

# Clean up
docker-compose down -v
```

For detailed Docker documentation, see [DOCKER.md](DOCKER.md)

## API Documentation

Once the server is running, access API documentation at:
```
http://localhost:3000/api-docs
```

## Project Structure

```
aircraft-defect-detection/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   └── server.js        # Entry point
├── ml-service/          # Python ML inference service
│   ├── services/        # ML components
│   ├── utils/           # Helper functions
│   └── app.py           # Flask app
├── frontend/            # HTML/CSS/JS files
│   ├── user/            # User interface pages
│   ├── admin/           # Admin interface pages
│   ├── js/              # JavaScript modules
│   └── css/             # Stylesheets
├── tests/               # Test files
├── logs/                # Application logs
└── uploads/             # Temporary file uploads

```

## Environment Variables

The application uses environment variables for configuration. Three configuration profiles are provided:

- **`.env.development`** - Local development with local services
- **`.env.production`** - Production deployment with cloud services
- **`.env.docker`** - Docker containerized deployment

### Quick Setup

```bash
# For local development
cp .env.development .env

# For Docker deployment
cp .env.docker .env

# For production deployment
cp .env.production .env
```

### Required Variables

The following variables **must** be configured before running the application:

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT Vision | `sk-...` |
| `JWT_SECRET` | Secret key for JWT token signing | Generate with `openssl rand -base64 64` |
| `SESSION_SECRET` | Secret key for session management | Generate with `openssl rand -base64 64` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/aircraft_detection` |

### Configuration Categories

#### Application Settings
- `NODE_ENV` - Environment mode (development, production, test)
- `PORT` - Backend server port (default: 3000)
- `APP_BASE_URL` - Application base URL for links and redirects

#### Database Configuration
- `MONGODB_URI` - MongoDB connection string
- `MONGO_POOL_SIZE` - Connection pool size (default: 100)
- `REDIS_URL` - Redis connection URL
- `REDIS_SESSION_TTL` - Session cache TTL in seconds (default: 86400)

#### Authentication & Security
- `JWT_SECRET` - JWT signing secret (required)
- `JWT_EXPIRATION` - Token expiration time (default: 24h)
- `BCRYPT_SALT_ROUNDS` - Password hashing rounds (default: 10)
- `MAX_LOGIN_ATTEMPTS` - Failed login attempts before lockout (default: 5)
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins

#### Storage Configuration
- `USE_LOCAL_STORAGE` - Use local filesystem (true) or AWS S3 (false)
- `UPLOAD_DIR` - Local upload directory (when using local storage)
- `AWS_S3_BUCKET` - S3 bucket name (when using S3)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)

#### ML Service Configuration
- `ML_SERVICE_URL` - ML service endpoint URL
- `YOLO_MODEL_PATH` - Path to YOLOv8 model weights
- `YOLO_CONFIDENCE_THRESHOLD` - Detection confidence threshold (default: 0.5)
- `ENSEMBLE_YOLO_WEIGHT` - YOLO weight in ensemble (default: 0.6)
- `ENSEMBLE_GPT_WEIGHT` - GPT weight in ensemble (default: 0.4)

#### File Upload Settings
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 52428800 = 50MB)
- `ALLOWED_FILE_TYPES` - Comma-separated MIME types
- `MIN_IMAGE_DIMENSION` - Minimum image dimension in pixels (default: 640)
- `MAX_IMAGE_DIMENSION` - Maximum image dimension in pixels (default: 4096)

#### Rate Limiting
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (default: 60000)
- `AUTH_RATE_LIMIT_MAX_REQUESTS` - Max auth requests per window (default: 10)

#### Logging
- `LOG_LEVEL` - Logging level (error, warn, info, debug)
- `LOG_DIR` - Log files directory (default: ./logs)
- `LOG_CONSOLE_ENABLED` - Enable console logging (default: true)

### Environment-Specific Configuration

#### Development
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/aircraft_detection
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:5000
USE_LOCAL_STORAGE=true
LOG_LEVEL=debug
```

#### Production
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aircraft_detection
REDIS_URL=redis://:password@redis-host:port
ML_SERVICE_URL=https://ml-service.yourdomain.com
USE_LOCAL_STORAGE=false
AWS_S3_BUCKET=aircraft-images-prod
LOG_LEVEL=info
```

#### Docker
```bash
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/aircraft_detection
REDIS_URL=redis://redis:6379
ML_SERVICE_URL=http://ml-service:5000
USE_LOCAL_STORAGE=true
```

### Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Generate strong secrets** - Use `openssl rand -base64 64`
3. **Rotate secrets regularly** - Especially JWT and session secrets
4. **Use environment-specific configs** - Different secrets for dev/prod
5. **Restrict CORS origins** - Only allow trusted domains in production
6. **Enable rate limiting** - Protect against abuse
7. **Use HTTPS in production** - Secure all communications

### Generating Secrets

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate session secret
openssl rand -base64 64

# Generate random password
openssl rand -base64 32
```

For complete variable reference, see `.env.example`.

## Testing

The project includes comprehensive unit and integration tests.

### Unit Tests

Unit tests cover individual components with mocked dependencies:

```bash
# Run all unit tests
npm run test:unit

# Run all tests with coverage
npm test

# Run specific test file
npm test auth.test.js

# Run in watch mode
npm test -- --watch
```

### Integration Tests

Integration tests validate complete workflows with real MongoDB:

```bash
# Run integration tests (requires MongoDB)
npm run test:integration

# Or use automated test runners
# Windows:
run-integration-tests.bat

# Linux/Mac:
./run-integration-tests.sh
```

**Integration Test Coverage:**
- ✅ Complete user registration and login flow
- ✅ End-to-end inspection workflow (upload → analyze → results → report)
- ✅ Admin user management workflow
- ✅ Admin model management workflow
- ✅ System monitoring and metrics
- ✅ Error handling and edge cases

**Prerequisites for Integration Tests:**
1. MongoDB running on `localhost:27017`
2. Redis running on `localhost:6379` (optional)
3. Environment variables configured

For detailed testing documentation:
- [Unit Test README](__tests__/README.md)
- [Integration Test Guide](__tests__/INTEGRATION_TEST_GUIDE.md)
- [Task 27 Testing Summary](TASK_27_TESTING_SUMMARY.md)
- [Task 30 Integration Testing Summary](TASK_30_INTEGRATION_TESTING_SUMMARY.md)

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
