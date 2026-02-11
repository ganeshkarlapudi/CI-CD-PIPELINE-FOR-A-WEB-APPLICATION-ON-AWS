#!/bin/bash

# Aircraft Defect Detection System - Startup Script
# This script helps set up and start the application using Docker

set -e

echo "=========================================="
echo "Aircraft Defect Detection System"
echo "Docker Deployment Script"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed."
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠ .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠ IMPORTANT: Please edit .env and set the following:"
    echo "  - JWT_SECRET (use a strong random string)"
    echo "  - OPENAI_API_KEY (your OpenAI API key)"
    echo "  - MONGO_ROOT_PASSWORD (change default password)"
    echo "  - REDIS_PASSWORD (change default password)"
    echo ""
    read -p "Press Enter after updating .env file to continue..."
fi

echo "✓ Environment file exists"
echo ""

# Ask for deployment mode
echo "Select deployment mode:"
echo "1) Production (recommended)"
echo "2) Development (with hot-reloading)"
read -p "Enter choice [1-2]: " mode

case $mode in
    1)
        echo ""
        echo "Starting in PRODUCTION mode..."
        COMPOSE_CMD="docker-compose up -d"
        ;;
    2)
        echo ""
        echo "Starting in DEVELOPMENT mode..."
        COMPOSE_CMD="docker-compose -f docker-compose.yml -f docker-compose.dev.yml up"
        ;;
    *)
        echo "Invalid choice. Defaulting to production mode."
        COMPOSE_CMD="docker-compose up -d"
        ;;
esac

echo ""
echo "Building Docker images..."
docker-compose build

echo ""
echo "Starting services..."
$COMPOSE_CMD

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "=========================================="
echo "✓ Deployment Complete!"
echo "=========================================="
echo ""
echo "Access the application:"
echo "  Frontend:  http://localhost"
echo "  Backend:   http://localhost:3000"
echo "  ML Service: http://localhost:5000"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose down"
echo "  Restart services: docker-compose restart"
echo ""
echo "For more information, see DOCKER.md"
echo ""
