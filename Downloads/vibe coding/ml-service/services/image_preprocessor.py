"""
Image Preprocessing Service
Handles image loading, validation, and preprocessing for ML inference
"""

import cv2
import numpy as np
from PIL import Image
import requests
from io import BytesIO
import logging

logger = logging.getLogger('ml-service')


class ImagePreprocessor:
    """
    Image preprocessing service for aircraft defect detection
    Handles image loading, validation, resizing, and quality enhancement
    """
    
    def __init__(self, target_size=640, min_size=640, max_size=4096):
        """
        Initialize image preprocessor
        
        Args:
            target_size: Target size for YOLO input (default: 640x640)
            min_size: Minimum acceptable image dimension
            max_size: Maximum acceptable image dimension
        """
        self.target_size = target_size
        self.min_size = min_size
        self.max_size = max_size
        logger.info(f"ImagePreprocessor initialized: target={target_size}, range={min_size}-{max_size}")
    
    def load_image_from_url(self, image_url, timeout=30):
        """
        Load image from S3 URL or HTTP URL
        
        Args:
            image_url: URL to the image
            timeout: Request timeout in seconds
            
        Returns:
            numpy.ndarray: Loaded image in BGR format
            
        Raises:
            ValueError: If image cannot be loaded or is invalid
        """
        try:
            logger.info(f"Loading image from URL: {image_url}")
            
            # Download image
            response = requests.get(image_url, timeout=timeout)
            response.raise_for_status()
            
            # Convert to PIL Image
            pil_image = Image.open(BytesIO(response.content))
            
            # Convert to RGB if necessary
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # Convert to numpy array (RGB)
            image_rgb = np.array(pil_image)
            
            # Convert RGB to BGR for OpenCV
            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            
            logger.info(f"Image loaded successfully: shape={image_bgr.shape}")
            return image_bgr
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to download image from URL: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"Failed to load image: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
    
    def validate_dimensions(self, image):
        """
        Validate image dimensions are within acceptable range
        
        Args:
            image: numpy.ndarray image
            
        Returns:
            bool: True if dimensions are valid
            
        Raises:
            ValueError: If dimensions are out of range
        """
        height, width = image.shape[:2]
        
        if height < self.min_size or width < self.min_size:
            raise ValueError(
                f"Image dimensions too small: {width}x{height}. "
                f"Minimum: {self.min_size}x{self.min_size}"
            )
        
        if height > self.max_size or width > self.max_size:
            raise ValueError(
                f"Image dimensions too large: {width}x{height}. "
                f"Maximum: {self.max_size}x{self.max_size}"
            )
        
        logger.info(f"Image dimensions validated: {width}x{height}")
        return True
    
    def resize_for_yolo(self, image):
        """
        Resize image to YOLO input size while maintaining aspect ratio
        
        Args:
            image: numpy.ndarray image in BGR format
            
        Returns:
            numpy.ndarray: Resized image
        """
        height, width = image.shape[:2]
        
        # Calculate scaling factor to fit within target size
        scale = min(self.target_size / width, self.target_size / height)
        
        # Calculate new dimensions
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        # Resize image
        resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
        
        # Create padded image (letterbox)
        padded = np.full((self.target_size, self.target_size, 3), 114, dtype=np.uint8)
        
        # Calculate padding offsets
        x_offset = (self.target_size - new_width) // 2
        y_offset = (self.target_size - new_height) // 2
        
        # Place resized image in center
        padded[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized
        
        logger.info(f"Image resized: {width}x{height} -> {self.target_size}x{self.target_size}")
        return padded
    
    def normalize_brightness_contrast(self, image, clip_limit=2.0, tile_grid_size=(8, 8)):
        """
        Normalize brightness and contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
        
        Args:
            image: numpy.ndarray image in BGR format
            clip_limit: Threshold for contrast limiting
            tile_grid_size: Size of grid for histogram equalization
            
        Returns:
            numpy.ndarray: Normalized image
        """
        # Convert to LAB color space
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        
        # Split channels
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
        l_normalized = clahe.apply(l)
        
        # Merge channels
        lab_normalized = cv2.merge([l_normalized, a, b])
        
        # Convert back to BGR
        normalized = cv2.cvtColor(lab_normalized, cv2.COLOR_LAB2BGR)
        
        logger.debug("Brightness and contrast normalized")
        return normalized
    
    def apply_adaptive_filtering(self, image):
        """
        Apply adaptive filtering to reduce glare and shadows
        
        Args:
            image: numpy.ndarray image in BGR format
            
        Returns:
            numpy.ndarray: Filtered image
        """
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate mean brightness
        mean_brightness = np.mean(gray)
        
        # Apply bilateral filter to reduce noise while preserving edges
        filtered = cv2.bilateralFilter(image, d=9, sigmaColor=75, sigmaSpace=75)
        
        # If image is too bright (glare), apply additional processing
        if mean_brightness > 180:
            logger.debug("High brightness detected, applying glare reduction")
            # Reduce highlights
            filtered = cv2.addWeighted(filtered, 0.8, np.zeros_like(filtered), 0, -20)
        
        # If image is too dark (shadows), apply additional processing
        elif mean_brightness < 80:
            logger.debug("Low brightness detected, applying shadow enhancement")
            # Enhance shadows
            filtered = cv2.addWeighted(filtered, 1.2, np.zeros_like(filtered), 0, 20)
        
        logger.debug("Adaptive filtering applied")
        return filtered
    
    def calculate_quality_score(self, image):
        """
        Calculate image quality score based on sharpness and brightness
        
        Args:
            image: numpy.ndarray image in BGR format
            
        Returns:
            float: Quality score (0-100)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate sharpness using Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_score = min(laplacian_var / 1000.0, 1.0) * 50  # Max 50 points
        
        # Calculate brightness score
        mean_brightness = np.mean(gray)
        # Optimal brightness is around 128, score decreases as it deviates
        brightness_deviation = abs(mean_brightness - 128) / 128.0
        brightness_score = (1.0 - brightness_deviation) * 50  # Max 50 points
        
        # Total quality score
        quality_score = sharpness_score + brightness_score
        
        logger.info(f"Image quality score: {quality_score:.2f}/100 "
                   f"(sharpness: {sharpness_score:.2f}, brightness: {brightness_score:.2f})")
        
        return quality_score
    
    def preprocess(self, image_url):
        """
        Complete preprocessing pipeline
        
        Args:
            image_url: URL to the image
            
        Returns:
            dict: {
                'original': Original image (BGR),
                'processed': Processed image ready for YOLO (BGR),
                'quality_score': Image quality score (0-100),
                'dimensions': Original dimensions (width, height)
            }
            
        Raises:
            ValueError: If image processing fails
        """
        try:
            # Load image from URL
            original_image = self.load_image_from_url(image_url)
            
            # Store original dimensions
            height, width = original_image.shape[:2]
            original_dimensions = (width, height)
            
            # Validate dimensions
            self.validate_dimensions(original_image)
            
            # Calculate quality score on original image
            quality_score = self.calculate_quality_score(original_image)
            
            # Apply preprocessing
            processed = original_image.copy()
            
            # Normalize brightness and contrast
            processed = self.normalize_brightness_contrast(processed)
            
            # Apply adaptive filtering for glare and shadows
            processed = self.apply_adaptive_filtering(processed)
            
            # Resize for YOLO
            processed = self.resize_for_yolo(processed)
            
            logger.info(f"Preprocessing complete: quality={quality_score:.2f}, "
                       f"original_size={original_dimensions}")
            
            return {
                'original': original_image,
                'processed': processed,
                'quality_score': quality_score,
                'dimensions': original_dimensions
            }
            
        except Exception as e:
            error_msg = f"Image preprocessing failed: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
