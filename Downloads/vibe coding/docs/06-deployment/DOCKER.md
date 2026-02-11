# Docker Deployment Guide

This guide explains how to deploy the Aircraft Defect Detection System using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM
- 10GB of free disk space

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and set the following required variables:
- `JWT_SECRET`: A secure random string for JWT token signing
- `OPENAI_API_KEY`: Your OpenAI API key for GPT Vision
- `MONGO_ROOT_PASSWORD`: MongoDB root password
- `REDIS_PASSWORD`: Redis password

### 2. Build and Start Services

**Production Mode:**
```bash
docker-compose up -d
```

**Development Mode (with hot-reloading):**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 3. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **ML Service**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### 4. Stop Services

```bash
docker-compose down
```

To remove volumes (delete all data):
```bash
docker-compose down -v
```

## Architecture

The application consists of 5 Docker containers:

1. **frontend** (Nginx): Serves static HTML/CSS/JS files and proxies API requests
2. **backend** (Node.js): Express API server handling authentication, inspections, and admin functions
3. **ml-service** (Python): Flask service running YOLOv8 and GPT Vision inference
4. **mongodb**: Database for storing users, inspections, and system data
5. **redis**: Cache for sessions, model weights, and frequently accessed data

All containers communicate through a dedicated Docker network (`aircraft-network`).

## Services Configuration

### Frontend (Nginx)

- **Port**: 80
- **Image**: nginx:alpine
- **Volumes**: None (static files copied during build)
- **Health Check**: HTTP GET /health

### Backend (Node.js)

- **Port**: 3000
- **Base Image**: node:18-alpine
- **Volumes**:
  - `backend_logs`: Application logs
  - `backend_uploads`: Uploaded images (shared with ML service)
- **Health Check**: HTTP GET /api/health
- **Dependencies**: mongodb, redis

### ML Service (Python)

- **Port**: 5000
- **Base Image**: python:3.10-slim
- **Volumes**:
  - `ml_models`: YOLOv8 model weights
  - `ml_cache`: Temporary processing cache
  - `backend_uploads`: Read-only access to uploaded images
- **Health Check**: HTTP GET /health
- **GPU Support**: Add `deploy.resources.reservations.devices` for GPU acceleration

### MongoDB

- **Port**: 27017
- **Image**: mongo:6.0
- **Volumes**:
  - `mongodb_data`: Database files
  - `mongodb_config`: Configuration files
- **Authentication**: Enabled with root username/password
- **Health Check**: mongosh ping command

### Redis

- **Port**: 6379
- **Image**: redis:7.0-alpine
- **Volumes**:
  - `redis_data`: Persistent cache data
- **Configuration**: 
  - Password authentication enabled
  - Max memory: 256MB
  - Eviction policy: allkeys-lru
- **Health Check**: redis-cli ping

## Volume Management

### Named Volumes

All data is stored in Docker named volumes for persistence:

- `mongodb_data`: MongoDB database files
- `mongodb_config`: MongoDB configuration
- `redis_data`: Redis cache data
- `backend_logs`: Application logs
- `backend_uploads`: Uploaded inspection images
- `ml_models`: YOLOv8 model weights
- `ml_cache`: ML processing cache

### Backup Volumes

**Backup MongoDB:**
```bash
docker exec aircraft-detection-mongodb mongodump --out /data/backup
docker cp aircraft-detection-mongodb:/data/backup ./mongodb-backup
```

**Restore MongoDB:**
```bash
docker cp ./mongodb-backup aircraft-detection-mongodb:/data/backup
docker exec aircraft-detection-mongodb mongorestore /data/backup
```

**Backup Uploads:**
```bash
docker run --rm -v aircraft-defect-detection_backend_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

**Restore Uploads:**
```bash
docker run --rm -v aircraft-defect-detection_backend_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key-change-in-production` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | `securepassword123` |
| `REDIS_PASSWORD` | Redis password | `redispassword123` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `MONGO_ROOT_USERNAME` | `admin` | MongoDB root username |
| `MONGO_DATABASE` | `aircraft_detection` | Database name |
| `USE_LOCAL_STORAGE` | `true` | Use local storage instead of S3 |
| `YOLO_CONFIDENCE_THRESHOLD` | `0.5` | YOLO detection threshold |
| `ENSEMBLE_YOLO_WEIGHT` | `0.6` | YOLO weight in ensemble |
| `ENSEMBLE_GPT_WEIGHT` | `0.4` | GPT weight in ensemble |

## Development Mode

Development mode enables hot-reloading for faster development:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Features:**
- Source code mounted as volumes (changes reflect immediately)
- Debug logging enabled
- Development dependencies included
- Flask debug mode enabled

## Production Deployment

### Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Use strong `JWT_SECRET` (32+ random characters)
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules (only expose port 80/443)
- [ ] Set `NODE_ENV=production`
- [ ] Review and restrict CORS settings
- [ ] Enable MongoDB authentication
- [ ] Use Redis password authentication
- [ ] Regularly update Docker images

### Performance Optimization

**Enable GPU for ML Service:**

Add to `docker-compose.yml` under `ml-service`:
```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

**Scale Backend Service:**
```bash
docker-compose up -d --scale backend=3
```

**Resource Limits:**

Add to each service in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

## Monitoring

### View Logs

**All services:**
```bash
docker-compose logs -f
```

**Specific service:**
```bash
docker-compose logs -f backend
docker-compose logs -f ml-service
```

**Last 100 lines:**
```bash
docker-compose logs --tail=100 backend
```

### Container Status

```bash
docker-compose ps
```

### Resource Usage

```bash
docker stats
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs <service-name>
```

**Check health status:**
```bash
docker inspect --format='{{.State.Health.Status}}' aircraft-detection-backend
```

### MongoDB Connection Issues

**Verify MongoDB is running:**
```bash
docker-compose ps mongodb
```

**Test connection:**
```bash
docker exec -it aircraft-detection-mongodb mongosh -u admin -p admin123
```

### Redis Connection Issues

**Test Redis:**
```bash
docker exec -it aircraft-detection-redis redis-cli -a redis123 ping
```

### ML Service Errors

**Check Python dependencies:**
```bash
docker-compose exec ml-service pip list
```

**Download YOLO model manually:**
```bash
docker-compose exec ml-service python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Frontend
  - "3001:3000"  # Backend
  - "5001:5000"  # ML Service
```

### Out of Disk Space

**Clean up unused resources:**
```bash
docker system prune -a --volumes
```

**Check volume sizes:**
```bash
docker system df -v
```

## Maintenance

### Update Images

```bash
docker-compose pull
docker-compose up -d
```

### Rebuild After Code Changes

```bash
docker-compose build
docker-compose up -d
```

### Clean Rebuild

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build images
        run: docker-compose build
      
      - name: Run tests
        run: docker-compose run backend npm test
      
      - name: Deploy
        run: |
          docker-compose down
          docker-compose up -d
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review this documentation
3. Check Docker and Docker Compose versions
4. Verify environment variables in `.env`
