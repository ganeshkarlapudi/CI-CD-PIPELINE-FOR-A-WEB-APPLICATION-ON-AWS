"""
Configuration utilities for ML service
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration class"""
    
    # Flask Configuration
    ML_SERVICE_PORT = int(os.getenv('ML_SERVICE_PORT', 5000))
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development'
    
    # YOLO Configuration
    YOLO_MODEL_PATH = os.getenv('YOLO_MODEL_PATH', 'models/yolov8_latest.pt')
    YOLO_CONFIDENCE_THRESHOLD = float(os.getenv('YOLO_CONFIDENCE_THRESHOLD', '0.5'))
    
    # GPT Vision Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    GPT_VISION_MODEL = os.getenv('GPT_VISION_MODEL', 'gpt-4-vision-preview')
    
    # Ensemble Configuration
    ENSEMBLE_YOLO_WEIGHT = float(os.getenv('ENSEMBLE_YOLO_WEIGHT', '0.6'))
    ENSEMBLE_GPT_WEIGHT = float(os.getenv('ENSEMBLE_GPT_WEIGHT', '0.4'))
    
    # Image Processing Configuration
    MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE', '4096'))
    MIN_IMAGE_SIZE = int(os.getenv('MIN_IMAGE_SIZE', '640'))
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        errors = []
        
        if not cls.OPENAI_API_KEY:
            errors.append("OPENAI_API_KEY is not configured")
        
        if not os.path.exists(os.path.dirname(cls.YOLO_MODEL_PATH)):
            errors.append(f"YOLO model directory does not exist: {os.path.dirname(cls.YOLO_MODEL_PATH)}")
        
        return errors
    
    @classmethod
    def get_config_summary(cls):
        """Get configuration summary for logging"""
        return {
            'port': cls.ML_SERVICE_PORT,
            'environment': cls.FLASK_ENV,
            'yolo_model_path': cls.YOLO_MODEL_PATH,
            'yolo_confidence_threshold': cls.YOLO_CONFIDENCE_THRESHOLD,
            'gpt_vision_model': cls.GPT_VISION_MODEL,
            'ensemble_weights': {
                'yolo': cls.ENSEMBLE_YOLO_WEIGHT,
                'gpt': cls.ENSEMBLE_GPT_WEIGHT
            },
            'image_size_range': {
                'min': cls.MIN_IMAGE_SIZE,
                'max': cls.MAX_IMAGE_SIZE
            }
        }
