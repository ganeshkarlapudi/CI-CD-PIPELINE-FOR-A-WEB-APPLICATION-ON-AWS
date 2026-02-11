# Aircraft Defect Detection ML Service

Python Flask application for ML inference using YOLOv8 and GPT Vision API.

## Directory Structure

```
ml-service/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── services/             # Service classes
│   └── __init__.py
├── utils/                # Utility functions
│   ├── __init__.py
│   ├── config.py        # Configuration management
│   └── logger.py        # Logging utilities
└── models/              # YOLO model weights directory
    └── .gitkeep
```

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Place YOLO model weights in the `models/` directory:
```bash
# Download or copy yolov8_latest.pt to models/
```

## Configuration

Edit `.env` file with the following variables:

- `ML_SERVICE_PORT`: Port for Flask service (default: 5000)
- `FLASK_ENV`: Environment (development/production)
- `YOLO_MODEL_PATH`: Path to YOLO model weights
- `YOLO_CONFIDENCE_THRESHOLD`: Detection confidence threshold (0-1)
- `OPENAI_API_KEY`: OpenAI API key for GPT Vision
- `GPT_VISION_MODEL`: GPT Vision model name
- `ENSEMBLE_YOLO_WEIGHT`: Weight for YOLO predictions (0-1)
- `ENSEMBLE_GPT_WEIGHT`: Weight for GPT predictions (0-1)
- `MAX_IMAGE_SIZE`: Maximum image dimension in pixels
- `MIN_IMAGE_SIZE`: Minimum image dimension in pixels

## Running the Service

```bash
python app.py
```

The service will start on `http://0.0.0.0:5000` (or configured port).

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Readiness Check
```
GET /ready
```
Returns service readiness status (checks model and API configuration).

## Development

### Adding New Services

Create service classes in the `services/` directory:

```python
# services/my_service.py
class MyService:
    def __init__(self):
        pass
    
    def process(self, data):
        # Implementation
        pass
```

### Adding Utilities

Create utility functions in the `utils/` directory:

```python
# utils/my_utils.py
def my_helper_function():
    # Implementation
    pass
```

## Testing

Run the service and test endpoints:

```bash
# Health check
curl http://localhost:5000/health

# Readiness check
curl http://localhost:5000/ready
```

## Dependencies

- Flask: Web framework
- flask-cors: CORS support
- ultralytics: YOLOv8 implementation
- opencv-python: Image processing
- numpy: Numerical operations
- openai: GPT Vision API client
- pillow: Image handling
- requests: HTTP client
- python-dotenv: Environment variable management
- torch/torchvision: PyTorch for deep learning

## License

Proprietary - Aircraft Defect Detection System
