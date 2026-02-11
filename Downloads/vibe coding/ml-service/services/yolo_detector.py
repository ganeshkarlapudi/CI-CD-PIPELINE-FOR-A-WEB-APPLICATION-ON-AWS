"""
YOLOv8 Detection Service
Handles aircraft defect detection using YOLOv8 model
"""

import cv2
import numpy as np
from ultralytics import YOLO
import logging
import os

logger = logging.getLogger('ml-service')


class YOLODetector:
    """
    YOLOv8 detection service for aircraft defect detection
    """
    
    # Defect class names (12 classes as per requirements)
    CLASS_NAMES = [
        'damaged_rivet',
        'missing_rivet',
        'filiform_corrosion',
        'missing_panel',
        'paint_detachment',
        'scratch',
        'composite_damage',
        'random_damage',
        'burn_mark',
        'scorch_mark',
        'metal_fatigue',
        'crack'
    ]
    
    def __init__(self, model_path, confidence_threshold=0.5):
        """
        Initialize YOLO detector
        
        Args:
            model_path: Path to YOLOv8 model weights
            confidence_threshold: Minimum confidence for detections (default: 0.5)
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.model = None
        
        logger.info(f"YOLODetector initialized: model={model_path}, threshold={confidence_threshold}")
    
    def load_model(self):
        """
        Load YOLOv8 model weights
        
        Raises:
            FileNotFoundError: If model file doesn't exist
            Exception: If model loading fails
        """
        try:
            if not os.path.exists(self.model_path):
                # For development/testing, use pre-trained YOLO model
                logger.warning(f"Model file not found: {self.model_path}")
                logger.info("Loading pre-trained YOLOv8n model for testing")
                self.model = YOLO('yolov8n.pt')
                logger.info("Pre-trained YOLOv8n model loaded successfully")
            else:
                logger.info(f"Loading YOLO model from: {self.model_path}")
                self.model = YOLO(self.model_path)
                logger.info("YOLO model loaded successfully")
                
        except Exception as e:
            error_msg = f"Failed to load YOLO model: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def detect(self, image):
        """
        Run YOLO inference on image
        
        Args:
            image: numpy.ndarray image in BGR format
            
        Returns:
            list: Raw YOLO detection results
            
        Raises:
            Exception: If inference fails
        """
        try:
            # Load model if not already loaded
            if self.model is None:
                self.load_model()
            
            logger.info("Running YOLO inference...")
            
            # Run inference
            results = self.model(image, conf=self.confidence_threshold, verbose=False)
            
            logger.info(f"YOLO inference complete: {len(results)} result(s)")
            return results
            
        except Exception as e:
            error_msg = f"YOLO inference failed: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def postprocess(self, results, original_dimensions=None):
        """
        Post-process YOLO results to extract bounding boxes and classes
        
        Args:
            results: Raw YOLO detection results
            original_dimensions: Original image dimensions (width, height) for scaling
            
        Returns:
            list: Detections in standard format [{
                'class': str,
                'confidence': float,
                'bbox': {'x': int, 'y': int, 'width': int, 'height': int}
            }]
        """
        detections = []
        
        try:
            for result in results:
                boxes = result.boxes
                
                for box in boxes:
                    # Extract box coordinates (xyxy format)
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    
                    # Calculate width and height
                    width = int(x2 - x1)
                    height = int(y2 - y1)
                    x = int(x1)
                    y = int(y1)
                    
                    # Get confidence score
                    confidence = float(box.conf[0].cpu().numpy())
                    
                    # Get class index
                    class_idx = int(box.cls[0].cpu().numpy())
                    
                    # Map class index to class name
                    # If using custom model, use CLASS_NAMES
                    # If using pre-trained model, use model's class names
                    if hasattr(result, 'names') and class_idx < len(result.names):
                        class_name = result.names[class_idx]
                    elif class_idx < len(self.CLASS_NAMES):
                        class_name = self.CLASS_NAMES[class_idx]
                    else:
                        class_name = f"class_{class_idx}"
                    
                    detection = {
                        'class': class_name,
                        'confidence': confidence,
                        'bbox': {
                            'x': x,
                            'y': y,
                            'width': width,
                            'height': height
                        }
                    }
                    
                    detections.append(detection)
            
            logger.info(f"Post-processing complete: {len(detections)} detection(s)")
            
            # Log detection summary
            if detections:
                class_counts = {}
                for det in detections:
                    class_name = det['class']
                    class_counts[class_name] = class_counts.get(class_name, 0) + 1
                
                logger.info(f"Detection summary: {class_counts}")
            
            return detections
            
        except Exception as e:
            error_msg = f"Post-processing failed: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def detect_and_process(self, image, original_dimensions=None):
        """
        Complete detection pipeline: inference + post-processing
        
        Args:
            image: numpy.ndarray image in BGR format
            original_dimensions: Original image dimensions (width, height)
            
        Returns:
            list: Detections in standard format
        """
        try:
            # Run inference
            results = self.detect(image)
            
            # Post-process results
            detections = self.postprocess(results, original_dimensions)
            
            return detections
            
        except Exception as e:
            logger.error(f"Detection pipeline failed: {str(e)}")
            raise
