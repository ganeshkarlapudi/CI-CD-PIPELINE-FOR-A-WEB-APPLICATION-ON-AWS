"""
GPT Vision API Client
Handles aircraft defect detection using OpenAI GPT-4 Vision API
"""

import cv2
import numpy as np
import base64
import logging
import time
from openai import OpenAI
import json

logger = logging.getLogger('ml-service')


class GPTVisionClient:
    """
    GPT-4 Vision API client for aircraft defect detection
    """
    
    # Defect class names (same as YOLO)
    DEFECT_CLASSES = [
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
    
    def __init__(self, api_key, model='gpt-4-vision-preview', max_retries=3):
        """
        Initialize GPT Vision client
        
        Args:
            api_key: OpenAI API key
            model: GPT Vision model name
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key
        self.model = model
        self.max_retries = max_retries
        self.client = OpenAI(api_key=api_key) if api_key else None
        
        logger.info(f"GPTVisionClient initialized: model={model}, max_retries={max_retries}")
    
    def encode_image_to_base64(self, image):
        """
        Encode image to base64 string
        
        Args:
            image: numpy.ndarray image in BGR format
            
        Returns:
            str: Base64 encoded image
        """
        try:
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Encode to JPEG
            success, buffer = cv2.imencode('.jpg', image_rgb)
            if not success:
                raise Exception("Failed to encode image to JPEG")
            
            # Convert to base64
            base64_image = base64.b64encode(buffer).decode('utf-8')
            
            logger.debug("Image encoded to base64")
            return base64_image
            
        except Exception as e:
            error_msg = f"Failed to encode image: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def create_detection_prompt(self):
        """
        Create prompt for GPT Vision to detect aircraft defects
        
        Returns:
            str: Formatted prompt
        """
        prompt = f"""You are an expert aircraft maintenance inspector analyzing images for defects.

Analyze this aircraft image and identify any defects from the following categories:
{', '.join(self.DEFECT_CLASSES)}

For each defect you detect:
1. Identify the defect type (must be one of the categories above)
2. Estimate the confidence level (0.0 to 1.0)
3. Provide the bounding box coordinates as percentages of image dimensions (x, y, width, height)

Return your response as a JSON array with this exact format:
[
  {{
    "class": "defect_type",
    "confidence": 0.85,
    "bbox": {{"x": 100, "y": 150, "width": 50, "height": 60}},
    "description": "Brief description of the defect"
  }}
]

If no defects are found, return an empty array: []

Important:
- Only detect defects from the specified categories
- Be conservative with confidence scores
- Provide accurate bounding box coordinates
- Focus on visible structural defects, not normal aircraft features"""

        return prompt
    
    def parse_response(self, response_text):
        """
        Parse GPT Vision API response to extract defect information
        
        Args:
            response_text: Raw response text from API
            
        Returns:
            list: Detections in standard format
        """
        try:
            logger.debug(f"Parsing GPT response: {response_text[:200]}...")
            
            # Try to extract JSON from response
            # GPT might wrap JSON in markdown code blocks
            text = response_text.strip()
            
            # Remove markdown code blocks if present
            if text.startswith('```json'):
                text = text[7:]
            elif text.startswith('```'):
                text = text[3:]
            
            if text.endswith('```'):
                text = text[:-3]
            
            text = text.strip()
            
            # Parse JSON
            detections_raw = json.loads(text)
            
            # Validate and format detections
            detections = []
            for det in detections_raw:
                if not isinstance(det, dict):
                    continue
                
                # Validate required fields
                if 'class' not in det or 'confidence' not in det or 'bbox' not in det:
                    logger.warning(f"Skipping invalid detection: {det}")
                    continue
                
                # Validate class name
                class_name = det['class']
                if class_name not in self.DEFECT_CLASSES:
                    logger.warning(f"Unknown class '{class_name}', skipping")
                    continue
                
                # Format detection
                detection = {
                    'class': class_name,
                    'confidence': float(det['confidence']),
                    'bbox': {
                        'x': int(det['bbox'].get('x', 0)),
                        'y': int(det['bbox'].get('y', 0)),
                        'width': int(det['bbox'].get('width', 0)),
                        'height': int(det['bbox'].get('height', 0))
                    }
                }
                
                # Add description if available
                if 'description' in det:
                    detection['description'] = det['description']
                
                detections.append(detection)
            
            logger.info(f"Parsed {len(detections)} detection(s) from GPT response")
            return detections
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from GPT response: {str(e)}")
            logger.debug(f"Response text: {response_text}")
            return []
        except Exception as e:
            logger.error(f"Failed to parse GPT response: {str(e)}")
            return []
    
    def analyze_image(self, image, retry_count=0):
        """
        Analyze image using GPT-4 Vision API
        
        Args:
            image: numpy.ndarray image in BGR format
            retry_count: Current retry attempt
            
        Returns:
            list: Detections in standard format
            
        Raises:
            Exception: If API call fails after all retries
        """
        try:
            if not self.client:
                raise Exception("OpenAI API key not configured")
            
            logger.info("Analyzing image with GPT Vision API...")
            
            # Encode image to base64
            base64_image = self.encode_image_to_base64(image)
            
            # Create prompt
            prompt = self.create_detection_prompt()
            
            # Call GPT Vision API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000
            )
            
            # Extract response text
            response_text = response.choices[0].message.content
            
            logger.info("GPT Vision API call successful")
            logger.debug(f"Response: {response_text[:200]}...")
            
            # Parse response
            detections = self.parse_response(response_text)
            
            return detections
            
        except Exception as e:
            error_msg = f"GPT Vision API call failed: {str(e)}"
            logger.error(error_msg)
            
            # Retry logic
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count  # Exponential backoff
                logger.info(f"Retrying in {wait_time} seconds... (attempt {retry_count + 1}/{self.max_retries})")
                time.sleep(wait_time)
                return self.analyze_image(image, retry_count + 1)
            else:
                logger.error(f"Max retries ({self.max_retries}) reached, giving up")
                raise Exception(error_msg)
    
    def analyze_with_timeout(self, image, timeout=30):
        """
        Analyze image with timeout
        
        Args:
            image: numpy.ndarray image in BGR format
            timeout: Timeout in seconds
            
        Returns:
            list: Detections in standard format
        """
        try:
            return self.analyze_image(image)
        except Exception as e:
            logger.error(f"GPT Vision analysis failed: {str(e)}")
            # Return empty list on failure to allow ensemble to continue
            return []
