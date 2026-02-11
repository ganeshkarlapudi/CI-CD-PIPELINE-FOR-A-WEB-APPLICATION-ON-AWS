# ML Service Dockerfile - Python Flask with YOLOv8
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY ml-service/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY ml-service/ .

# Create directories for models and cache
RUN mkdir -p models cache

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Start the Flask application with Gunicorn
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
