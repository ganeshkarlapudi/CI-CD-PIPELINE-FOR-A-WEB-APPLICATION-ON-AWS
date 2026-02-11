.PHONY: help build up down restart logs clean test dev prod backup restore

# Default target
help:
	@echo "Aircraft Defect Detection System - Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build       Build all Docker images"
	@echo "  up          Start all services in production mode"
	@echo "  down        Stop all services"
	@echo "  restart     Restart all services"
	@echo "  logs        View logs from all services"
	@echo "  clean       Remove all containers, volumes, and images"
	@echo "  test        Run tests in containers"
	@echo "  dev         Start services in development mode"
	@echo "  prod        Start services in production mode"
	@echo "  backup      Backup MongoDB and uploads"
	@echo "  restore     Restore MongoDB and uploads from backup"
	@echo "  ps          Show running containers"
	@echo "  shell-backend    Open shell in backend container"
	@echo "  shell-ml         Open shell in ML service container"

# Build all images
build:
	docker-compose build

# Start services in production mode
up:
	docker-compose up -d

# Start services in production mode (alias)
prod: up

# Start services in development mode
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Stop all services
down:
	docker-compose down

# Restart all services
restart: down up

# View logs
logs:
	docker-compose logs -f

# View logs for specific service
logs-backend:
	docker-compose logs -f backend

logs-ml:
	docker-compose logs -f ml-service

logs-frontend:
	docker-compose logs -f frontend

# Show container status
ps:
	docker-compose ps

# Clean up everything
clean:
	docker-compose down -v --rmi all --remove-orphans

# Run backend tests
test:
	docker-compose run --rm backend npm test

# Backup data
backup:
	@echo "Backing up MongoDB..."
	@mkdir -p backups
	docker exec aircraft-detection-mongodb mongodump --out /data/backup
	docker cp aircraft-detection-mongodb:/data/backup ./backups/mongodb-$(shell date +%Y%m%d-%H%M%S)
	@echo "Backing up uploads..."
	docker run --rm -v aircraft-defect-detection_backend_uploads:/data -v $(shell pwd)/backups:/backup alpine tar czf /backup/uploads-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "Backup completed!"

# Restore from backup (requires BACKUP_DATE variable)
restore:
	@if [ -z "$(BACKUP_DATE)" ]; then \
		echo "Error: BACKUP_DATE not specified"; \
		echo "Usage: make restore BACKUP_DATE=20240101-120000"; \
		exit 1; \
	fi
	@echo "Restoring MongoDB from backup $(BACKUP_DATE)..."
	docker cp ./backups/mongodb-$(BACKUP_DATE) aircraft-detection-mongodb:/data/backup
	docker exec aircraft-detection-mongodb mongorestore /data/backup
	@echo "Restoring uploads from backup $(BACKUP_DATE)..."
	docker run --rm -v aircraft-defect-detection_backend_uploads:/data -v $(shell pwd)/backups:/backup alpine tar xzf /backup/uploads-$(BACKUP_DATE).tar.gz -C /data
	@echo "Restore completed!"

# Open shell in backend container
shell-backend:
	docker-compose exec backend sh

# Open shell in ML service container
shell-ml:
	docker-compose exec ml-service bash

# Open MongoDB shell
shell-mongo:
	docker-compose exec mongodb mongosh -u admin -p admin123

# Open Redis CLI
shell-redis:
	docker-compose exec redis redis-cli -a redis123

# Check health of all services
health:
	@echo "Checking service health..."
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' aircraft-detection-frontend aircraft-detection-backend aircraft-detection-ml aircraft-detection-mongodb aircraft-detection-redis

# Pull latest images
pull:
	docker-compose pull

# Rebuild without cache
rebuild:
	docker-compose build --no-cache

# Show resource usage
stats:
	docker stats --no-stream

# Prune unused Docker resources
prune:
	docker system prune -f
