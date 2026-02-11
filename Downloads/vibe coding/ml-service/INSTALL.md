# ML Service Installation Guide

## Prerequisites

- Python 3.10 or higher
- pip (Python package manager)

## Installation Steps

### 1. Create Virtual Environment (Recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- Flask and Flask-CORS (web framework)
- Ultralytics (YOLOv8)
- OpenCV (image processing)
- NumPy (numerical operations)
- OpenAI (GPT Vision API)
- Pillow (image handling)
- Requests (HTTP client)
- python-dotenv (environment variables)
- PyTorch and TorchVision (deep learning)

### 3. Configure Environment

```bash
# Copy example environment file
copy .env.example .env

# Edit .env with your settings
# Required:
# - OPENAI_API_KEY: Your OpenAI API key
# Optional:
# - ML_SERVICE_PORT: Port number (default: 5000)
# - YOLO_MODEL_PATH: Path to YOLO weights
```

### 4. Prepare Model Directory

```bash
# The models/ directory is already created
# Place your YOLOv8 model weights file in models/
# Example: models/yolov8_latest.pt
```

### 5. Run the Service

```bash
python app.py
```

The service will start on `http://0.0.0.0:5000` (or your configured port).

## Verification

### Test Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ml-inference",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000000"
}
```

### Test Readiness Endpoint

```bash
curl http://localhost:5000/ready
```

Expected response (when configured):
```json
{
  "status": "ready",
  "checks": {
    "model_directory_exists": true,
    "model_file_exists": true,
    "api_configured": true
  },
  "timestamp": "2024-01-01T00:00:00.000000"
}
```

## Troubleshooting

### Import Errors

If you get `ModuleNotFoundError`, ensure:
1. Virtual environment is activated
2. All dependencies are installed: `pip install -r requirements.txt`

### Port Already in Use

If port 5000 is already in use:
1. Change `ML_SERVICE_PORT` in `.env` file
2. Or stop the process using port 5000

### Model Not Found

If you see model warnings:
1. Download YOLOv8 weights
2. Place in `models/` directory
3. Update `YOLO_MODEL_PATH` in `.env`

### API Key Issues

If readiness check fails:
1. Ensure `OPENAI_API_KEY` is set in `.env`
2. Verify the API key is valid
3. Check OpenAI account has API access

## Next Steps

After successful installation:
1. Implement image preprocessing service (Task 8.2)
2. Implement YOLOv8 detection service (Task 8.3)
3. Implement GPT Vision client (Task 8.4)
4. Implement ensemble aggregator (Task 8.5)
5. Create ML gateway endpoint (Task 8.6)
