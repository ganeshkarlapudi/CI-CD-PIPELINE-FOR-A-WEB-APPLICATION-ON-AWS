"""
Aircraft Defect Detection ML Service
Flask application for ML inference using YOLOv8 and GPT Vision API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Import utilities
from utils.config import Config
from utils.logger import setup_logger, log_request, log_response, log_error

# Import services
from services.image_preprocessor import ImagePreprocessor
from services.yolo_detector import YOLODetector
from services.gpt_vision_client import GPTVisionClient
from services.ensemble_aggregator import EnsembleAggregator

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load configuration
app.config.from_object(Config)

# Set up logging
logger = setup_logger('ml-service')

# Initialize services (lazy loading)
image_preprocessor = None
yolo_detector = None
gpt_vision_client = None
ensemble_aggregator = None


def get_services():
    """
    Initialize and return service instances (lazy loading)
    
    Returns:
        tuple: (preprocessor, yolo, gpt, ensemble)
    """
    global image_preprocessor, yolo_detector, gpt_vision_client, ensemble_aggregator
    
    if image_preprocessor is None:
        logger.info("Initializing services...")
        
        # Initialize image preprocessor
        image_preprocessor = ImagePreprocessor(
            target_size=640,
            min_size=Config.MIN_IMAGE_SIZE,
            max_size=Config.MAX_IMAGE_SIZE
        )
        
        # Initialize YOLO detector
        yolo_detector = YOLODetector(
            model_path=Config.YOLO_MODEL_PATH,
            confidence_threshold=Config.YOLO_CONFIDENCE_THRESHOLD
        )
        
        # Initialize GPT Vision client
        gpt_vision_client = GPTVisionClient(
            api_key=Config.OPENAI_API_KEY,
            model=Config.GPT_VISION_MODEL
        )
        
        # Initialize ensemble aggregator
        ensemble_aggregator = EnsembleAggregator(
            yolo_weight=Config.ENSEMBLE_YOLO_WEIGHT,
            gpt_weight=Config.ENSEMBLE_GPT_WEIGHT
        )
        
        logger.info("Services initialized successfully")
    
    return image_preprocessor, yolo_detector, gpt_vision_client, ensemble_aggregator

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify service is running
    
    Returns:
        JSON response with service status
    """
    log_request(logger, '/health', 'GET')
    
    response = {
        'status': 'healthy',
        'service': 'ml-inference',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }
    
    log_response(logger, '/health', 200)
    return jsonify(response), 200

@app.route('/ready', methods=['GET'])
def readiness_check():
    """
    Readiness check endpoint to verify service is ready to accept requests
    
    Returns:
        JSON response with readiness status
    """
    log_request(logger, '/ready', 'GET')
    
    try:
        # Check if model path exists (directory should exist even if model file doesn't yet)
        model_dir_exists = os.path.exists(os.path.dirname(app.config['YOLO_MODEL_PATH'])) if os.path.dirname(app.config['YOLO_MODEL_PATH']) else True
        model_file_exists = os.path.exists(app.config['YOLO_MODEL_PATH'])
        
        # Check if OpenAI API key is configured
        api_key_configured = bool(app.config['OPENAI_API_KEY'])
        
        # Service is ready if API key is configured (model can be loaded later)
        is_ready = api_key_configured
        status_code = 200 if is_ready else 503
        
        response = {
            'status': 'ready' if is_ready else 'not_ready',
            'checks': {
                'model_directory_exists': model_dir_exists,
                'model_file_exists': model_file_exists,
                'api_configured': api_key_configured
            },
            'timestamp': datetime.utcnow().isoformat()
        }
        
        log_response(logger, '/ready', status_code)
        return jsonify(response), status_code
        
    except Exception as e:
        log_error(logger, e, 'Readiness check failed')
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    """Handle bad request errors"""
    log_error(logger, error, 'Bad request')
    return jsonify({
        'success': False,
        'error': {
            'code': 'BAD_REQUEST',
            'message': str(error),
            'timestamp': datetime.utcnow().isoformat()
        }
    }), 400

@app.errorhandler(404)
def not_found(error):
    """Handle not found errors"""
    return jsonify({
        'success': False,
        'error': {
            'code': 'NOT_FOUND',
            'message': 'Endpoint not found',
            'timestamp': datetime.utcnow().isoformat()
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors"""
    log_error(logger, error, 'Internal server error')
    return jsonify({
        'success': False,
        'error': {
            'code': 'INTERNAL_ERROR',
            'message': 'An internal error occurred',
            'timestamp': datetime.utcnow().isoformat()
        }
    }), 500


@app.route('/ml/detect', methods=['POST'])
def detect_defects():
    """
    ML Gateway endpoint for aircraft defect detection
    
    Request Body:
        {
            "imageUrl": "https://s3.amazonaws.com/...",
            "inspectionId": "inspection_id_123"
        }
    
    Response:
        {
            "success": true,
            "data": {
                "defects": [
                    {
                        "class": "damaged_rivet",
                        "confidence": 0.85,
                        "bbox": {"x": 100, "y": 150, "width": 50, "height": 60},
                        "source": "ensemble"
                    }
                ],
                "processingTime": 8.5,
                "qualityScore": 78.5,
                "metadata": {
                    "inspectionId": "inspection_id_123",
                    "yoloDetections": 3,
                    "gptDetections": 2,
                    "finalDetections": 4
                }
            }
        }
    """
    start_time = time.time()
    
    try:
        log_request(logger, '/ml/detect', 'POST')
        
        # Validate request
        if not request.json:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body must be JSON',
                    'timestamp': datetime.utcnow().isoformat()
                }
            }), 400
        
        # Extract parameters
        image_url = request.json.get('imageUrl')
        inspection_id = request.json.get('inspectionId')
        
        if not image_url:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'MISSING_PARAMETER',
                    'message': 'imageUrl is required',
                    'timestamp': datetime.utcnow().isoformat()
                }
            }), 400
        
        logger.info(f"Processing detection request: inspectionId={inspection_id}, imageUrl={image_url[:50]}...")
        
        # Get service instances
        preprocessor, yolo, gpt, ensemble = get_services()
        
        # Step 1: Preprocess image
        logger.info("Step 1: Preprocessing image...")
        preprocess_result = preprocessor.preprocess(image_url)
        
        original_image = preprocess_result['original']
        processed_image = preprocess_result['processed']
        quality_score = preprocess_result['quality_score']
        original_dimensions = preprocess_result['dimensions']
        
        logger.info(f"Preprocessing complete: quality={quality_score:.2f}")
        
        # Step 2: Parallel inference (YOLO + GPT Vision)
        logger.info("Step 2: Running parallel inference (YOLO + GPT Vision)...")
        
        yolo_results = []
        gpt_results = []
        
        def run_yolo():
            """Run YOLO detection"""
            try:
                return yolo.detect_and_process(processed_image, original_dimensions)
            except Exception as e:
                logger.error(f"YOLO detection failed: {str(e)}")
                return []
        
        def run_gpt():
            """Run GPT Vision analysis"""
            try:
                return gpt.analyze_with_timeout(original_image, timeout=30)
            except Exception as e:
                logger.error(f"GPT Vision analysis failed: {str(e)}")
                return []
        
        # Execute in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_yolo = executor.submit(run_yolo)
            future_gpt = executor.submit(run_gpt)
            
            # Wait for both to complete
            yolo_results = future_yolo.result()
            gpt_results = future_gpt.result()
        
        logger.info(f"Parallel inference complete: YOLO={len(yolo_results)}, GPT={len(gpt_results)}")
        
        # Step 3: Ensemble aggregation
        logger.info("Step 3: Aggregating results...")
        final_detections = ensemble.aggregate(yolo_results, gpt_results)
        
        logger.info(f"Ensemble aggregation complete: {len(final_detections)} final detection(s)")
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Prepare response
        response_data = {
            'success': True,
            'data': {
                'defects': final_detections,
                'processingTime': round(processing_time, 2),
                'qualityScore': round(quality_score, 2),
                'metadata': {
                    'inspectionId': inspection_id,
                    'yoloDetections': len(yolo_results),
                    'gptDetections': len(gpt_results),
                    'finalDetections': len(final_detections),
                    'originalDimensions': {
                        'width': original_dimensions[0],
                        'height': original_dimensions[1]
                    }
                }
            }
        }
        
        log_response(logger, '/ml/detect', 200, processing_time)
        logger.info(f"Detection complete: {len(final_detections)} defect(s) found in {processing_time:.2f}s")
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        # Validation or preprocessing errors
        processing_time = time.time() - start_time
        log_error(logger, e, 'Validation error')
        
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 400
        
    except Exception as e:
        # Unexpected errors
        processing_time = time.time() - start_time
        log_error(logger, e, 'ML processing error')
        
        return jsonify({
            'success': False,
            'error': {
                'code': 'ML_ERROR',
                'message': 'ML processing failed',
                'details': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 500

if __name__ == '__main__':
    # Log startup information
    logger.info("=" * 60)
    logger.info("Starting Aircraft Defect Detection ML Service")
    logger.info("=" * 60)
    
    # Validate configuration
    config_errors = Config.validate()
    if config_errors:
        logger.warning("Configuration warnings:")
        for error in config_errors:
            logger.warning(f"  - {error}")
    
    # Log configuration summary
    config_summary = Config.get_config_summary()
    logger.info("Configuration:")
    logger.info(f"  Port: {config_summary['port']}")
    logger.info(f"  Environment: {config_summary['environment']}")
    logger.info(f"  YOLO Model Path: {config_summary['yolo_model_path']}")
    logger.info(f"  YOLO Confidence Threshold: {config_summary['yolo_confidence_threshold']}")
    logger.info(f"  GPT Vision Model: {config_summary['gpt_vision_model']}")
    logger.info(f"  Ensemble Weights: YOLO={config_summary['ensemble_weights']['yolo']}, GPT={config_summary['ensemble_weights']['gpt']}")
    logger.info(f"  Image Size Range: {config_summary['image_size_range']['min']}x{config_summary['image_size_range']['min']} to {config_summary['image_size_range']['max']}x{config_summary['image_size_range']['max']}")
    
    logger.info("=" * 60)
    logger.info(f"Service starting on http://0.0.0.0:{Config.ML_SERVICE_PORT}")
    logger.info("=" * 60)
    
    # Start Flask application
    app.run(
        host='0.0.0.0',
        port=Config.ML_SERVICE_PORT,
        debug=Config.DEBUG
    )
