# Docker Quick Reference

Quick reference for common Docker commands used with the Aircraft Defect Detection System.

## Starting & Stopping

```bash
# Start all services (production)
docker-compose up -d

# Start all services (development with hot-reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Stop all services
docker-compose down

# Stop and remove volumes (deletes all data!)
docker-compose down -v

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

## Building

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend

# Build without cache (clean build)
docker-compose build --no-cache

# Pull latest base images
docker-compose pull
```

## Viewing Logs

```bash
# View logs from all services
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs from specific service
docker-compose logs backend
docker-compose logs ml-service

# View last 100 lines
docker-compose logs --tail=100 backend

# View logs with timestamps
docker-compose logs -t
```

## Service Status

```bash
# List running containers
docker-compose ps

# Show detailed container info
docker ps -a

# Check health status
docker inspect --format='{{.State.Health.Status}}' aircraft-detection-backend

# View resource usage
docker stats

# View resource usage (one-time)
docker stats --no-stream
```

## Executing Commands

```bash
# Open shell in backend container
docker-compose exec backend sh

# Open shell in ML service container
docker-compose exec ml-service bash

# Run command in backend
docker-compose exec backend npm test

# Run command in ML service
docker-compose exec ml-service python -c "print('Hello')"

# Open MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123

# Open Redis CLI
docker-compose exec redis redis-cli -a redis123
```

## Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect aircraft-defect-detection_mongodb_data

# Backup volume
docker run --rm -v aircraft-defect-detection_backend_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v aircraft-defect-detection_backend_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data

# Remove unused volumes
docker volume prune
```

## Debugging

```bash
# View container logs
docker logs aircraft-detection-backend

# Follow container logs
docker logs -f aircraft-detection-backend

# Inspect container
docker inspect aircraft-detection-backend

# View container processes
docker top aircraft-detection-backend

# View container filesystem changes
docker diff aircraft-detection-backend

# Copy file from container
docker cp aircraft-detection-backend:/app/logs/error.log ./error.log

# Copy file to container
docker cp ./config.json aircraft-detection-backend:/app/config.json
```

## Network

```bash
# List networks
docker network ls

# Inspect network
docker network inspect aircraft-defect-detection_aircraft-network

# Test connectivity between containers
docker-compose exec backend ping ml-service
docker-compose exec backend curl http://ml-service:5000/health
```

## Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove everything unused
docker system prune

# Remove everything including volumes
docker system prune -a --volumes

# View disk usage
docker system df

# View detailed disk usage
docker system df -v
```

## Database Operations

### MongoDB

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123

# Backup database
docker exec aircraft-detection-mongodb mongodump --out /data/backup
docker cp aircraft-detection-mongodb:/data/backup ./mongodb-backup

# Restore database
docker cp ./mongodb-backup aircraft-detection-mongodb:/data/backup
docker exec aircraft-detection-mongodb mongorestore /data/backup

# View database collections
docker-compose exec mongodb mongosh -u admin -p admin123 --eval "use aircraft_detection; show collections"

# Count documents in collection
docker-compose exec mongodb mongosh -u admin -p admin123 --eval "use aircraft_detection; db.users.countDocuments()"
```

### Redis

```bash
# Access Redis CLI
docker-compose exec redis redis-cli -a redis123

# Check Redis info
docker-compose exec redis redis-cli -a redis123 INFO

# View all keys
docker-compose exec redis redis-cli -a redis123 KEYS '*'

# Get key value
docker-compose exec redis redis-cli -a redis123 GET session:abc123

# Flush all data (careful!)
docker-compose exec redis redis-cli -a redis123 FLUSHALL
```

## Scaling

```bash
# Scale backend service to 3 instances
docker-compose up -d --scale backend=3

# Scale ML service to 2 instances
docker-compose up -d --scale ml-service=2

# View scaled services
docker-compose ps
```

## Health Checks

```bash
# Check all service health
for container in aircraft-detection-frontend aircraft-detection-backend aircraft-detection-ml aircraft-detection-mongodb aircraft-detection-redis; do
  echo -n "$container: "
  docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "no health check"
done

# Test frontend
curl http://localhost/health

# Test backend
curl http://localhost:3000/api/health

# Test ML service
curl http://localhost:5000/health
```

## Environment Variables

```bash
# View environment variables in container
docker-compose exec backend env

# View specific environment variable
docker-compose exec backend printenv MONGODB_URI

# Run with different env file
docker-compose --env-file .env.production up -d
```

## Updates

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart services
docker-compose up -d --build

# Update specific service
docker-compose up -d --build backend

# Rolling update (zero downtime)
docker-compose up -d --no-deps --build backend
```

## Troubleshooting

```bash
# Service won't start
docker-compose logs <service-name>
docker inspect <container-name>

# Port already in use
docker-compose down
# Edit docker-compose.yml to change ports
docker-compose up -d

# Out of disk space
docker system prune -a --volumes
docker volume prune

# Container keeps restarting
docker logs <container-name>
docker-compose stop <service-name>
# Fix issue
docker-compose start <service-name>

# Can't connect to database
docker-compose exec backend ping mongodb
docker-compose logs mongodb

# Slow performance
docker stats
# Check resource limits in docker-compose.yml
```

## Makefile Shortcuts

If using the provided Makefile:

```bash
make help          # Show all available commands
make build         # Build all images
make up            # Start services (production)
make dev           # Start services (development)
make down          # Stop services
make logs          # View logs
make ps            # Show container status
make backup        # Backup data
make restore       # Restore data
make clean         # Remove everything
make health        # Check service health
```

## Common Workflows

### First Time Setup
```bash
cp .env.example .env
# Edit .env
docker-compose build
docker-compose up -d
docker-compose ps
```

### Daily Development
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
# Make code changes (auto-reload)
docker-compose logs -f backend
```

### Deploy Updates
```bash
git pull
docker-compose build
docker-compose up -d
docker-compose logs -f
```

### Backup Before Changes
```bash
make backup
# Make changes
# If issues: make restore BACKUP_DATE=20240101-120000
```

### Debug Issues
```bash
docker-compose ps
docker-compose logs -f
docker stats
./health-check.sh
```

## Tips

- Use `docker-compose` for multi-container operations
- Use `docker` for single container operations
- Always check logs when debugging: `docker-compose logs -f`
- Use health checks to verify services are ready
- Backup data before major changes
- Use `.env` file for configuration
- Don't commit `.env` to version control
- Use `--no-cache` when build issues occur
- Monitor disk space regularly
- Clean up unused resources periodically
