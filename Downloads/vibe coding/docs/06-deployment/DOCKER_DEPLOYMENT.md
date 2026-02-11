# Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- At least 4GB RAM available for Docker
- Ports 80, 3000, 5000, 6379, 27017 available

### Start the Application

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Access the Application

- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **ML Service**: http://localhost:5000

## Services Overview

### 1. MongoDB (Database)
- **Image**: mongo:6.0
- **Port**: 27017
- **Credentials**: admin/admin123 (configurable via .env)
- **Data**: Persisted in `mongodb_data` volume

### 2. Redis (Cache)
- **Image**: redis:7.0-alpine
- **Port**: 6379
- **Password**: redis123 (configurable via .env)
- **Memory**: 256MB with LRU eviction policy

### 3. Backend (Node.js/Express)
- **Port**: 3000
- **Features**:
  - RESTful API
  - JWT authentication
  - File upload handling
  - Swagger documentation
  - Health monitoring

### 4. ML Service (Python/Flask)
- **Port**: 5000
- **Features**:
  - YOLOv8 defect detection
  - GPT Vision API integration
  - Ensemble predictions
  - Model caching

### 5. Frontend (Nginx)
- **Port**: 80
- **Serves**: Static HTML/CSS/JS files
- **Proxy**: Routes API requests to backend

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=admin123
MONGO_DATABASE=aircraft_detection

# Redis
REDIS_PASSWORD=redis123

# Application
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRATION=24h

# Storage (set to true for local, false for AWS S3)
USE_LOCAL_STORAGE=true

# AWS (optional, only if USE_LOCAL_STORAGE=false)
AWS_S3_BUCKET=aircraft-images
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1

# OpenAI (optional)
OPENAI_API_KEY=your-openai-api-key

# ML Service
YOLO_CONFIDENCE_THRESHOLD=0.5
ENSEMBLE_YOLO_WEIGHT=0.6
ENSEMBLE_GPT_WEIGHT=0.4
```

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## Docker Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# Remove containers (keeps volumes)
docker-compose down

# Remove containers and volumes (clean slate)
docker-compose down -v
```

### Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f mongodb
docker-compose logs -f redis

# Check service health
docker-compose ps

# Inspect a service
docker inspect aircraft-detection-backend
```

### Debugging

```bash
# Execute command in running container
docker-compose exec backend sh
docker-compose exec mongodb mongosh

# View resource usage
docker stats

# Check network
docker network inspect vibe-coding_aircraft-network
```

## Health Checks

All services include health checks:

### Backend Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-05T10:00:00.000Z"
}
```

### ML Service Health Check
```bash
curl http://localhost:5000/health
```

### MongoDB Health Check
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Redis Health Check
```bash
docker-compose exec redis redis-cli -a redis123 ping
```

## Troubleshooting

### Services Won't Start

**Check Docker Desktop is running**:
```bash
docker info
```

**Check port conflicts**:
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :27017

# Kill process using port (replace PID)
taskkill /PID <PID> /F
```

**View service logs**:
```bash
docker-compose logs backend
```

### Database Connection Issues

**Check MongoDB is healthy**:
```bash
docker-compose ps mongodb
```

**Test connection**:
```bash
docker-compose exec backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
```

### Redis Connection Issues

**Check Redis is running**:
```bash
docker-compose exec redis redis-cli -a redis123 ping
```

### ML Service Issues

**Check Python dependencies**:
```bash
docker-compose exec ml-service pip list
```

**Test YOLO model**:
```bash
docker-compose logs ml-service | grep -i yolo
```

## Production Deployment

### Security Checklist

- [ ] Change default passwords (MongoDB, Redis)
- [ ] Generate strong JWT secret
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for your domain
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Use secrets management (not .env file)
- [ ] Regular security updates

### Performance Optimization

```yaml
# docker-compose.override.yml for production
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
  
  mongodb:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Backup Strategy

**MongoDB Backup**:
```bash
# Create backup
docker-compose exec mongodb mongodump --out /data/backup

# Copy to host
docker cp aircraft-detection-mongodb:/data/backup ./mongodb-backup

# Restore
docker-compose exec mongodb mongorestore /data/backup
```

**Volume Backup**:
```bash
# Backup all volumes
docker run --rm -v vibe-coding_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz /data
```

## Development Mode

Use the development compose file for hot-reloading:

```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up

# With rebuild
docker-compose -f docker-compose.dev.yml up --build
```

## Scaling

Scale specific services:

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Note: You'll need a load balancer for multiple backend instances
```

## Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers, volumes, and images
docker-compose down -v --rmi all

# Remove unused Docker resources
docker system prune -a
```

## Next Steps

1. **Start Docker Desktop**
2. **Run**: `docker-compose up -d`
3. **Access**: http://localhost
4. **Monitor**: `docker-compose logs -f`
5. **Test**: Register a user and upload an image

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify health: `docker-compose ps`
3. Review configuration: `.env` file
4. Check Docker resources: `docker stats`
