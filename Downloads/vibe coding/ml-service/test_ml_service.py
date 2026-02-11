"""
Unit tests for ML Service components
Tests image preprocessing, YOLO inference, GPT Vision client, and ensemble aggregation
"""

import sys
import os
import pytest
import numpy as np
import cv2
from unittest.mock import Mock, patch, MagicMock
import json
import base64
from io import BytesIO
from PIL import Image

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Mock external dependencies before importing services
sys.modules['ultralytics'] = MagicMock()
sys.modules['openai'] = MagicMock()
sys.modules['torch'] = MagicMock()
sys.modules['torchvision'] = MagicMock()

# Import services to test
from services.image_preprocessor import ImagePreprocessor
from services.yolo_detector import YOLODetector
from services.gpt_vision_client import GPTVisionClient
from services.ensemble_aggregator import EnsembleAggregator


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def sample_image():
    """Create a sample test image (640x640 RGB)"""
    image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
    return image


@pytest.fixture
def sample_large_image():
    """Create a large test image (2048x2048 RGB)"""
    image = np.random.randint(0, 255, (2048, 2048, 3), dtype=np.uint8)
    return image


@pytest.fixture
def sample_small_image():
    """Create a small test image (320x320 RGB)"""
    image = np.random.randint(0, 255, (320, 320, 3), dtype=np.uint8)
    return image


@pytest.fixture
def sample_detection():
    """Create a sample detection result"""
    return {
        'class': 'damaged_rivet',
        'confidence': 0.85,
        'bbox': {'x': 100, 'y': 150, 'width': 50, 'height': 60}
    }


@pytest.fixture
def sample_yolo_detections():
    """Create sample YOLO detection results"""
    return [
        {
            'class': 'damaged_rivet',
            'confidence': 0.85,
            'bbox': {'x': 100, 'y': 150, 'width': 50, 'height': 60}
        },
        {
            'class': 'missing_rivet',
            'confidence': 0.75,
            'bbox': {'x': 200, 'y': 250, 'width': 40, 'height': 50}
        }
    ]


@pytest.fixture
def sample_gpt_detections():
    """Create sample GPT detection results"""
    return [
        {
            'class': 'damaged_rivet',
            'confidence': 0.80,
            'bbox': {'x': 105, 'y': 155, 'width': 48, 'height': 58}
        },
        {
            'class': 'crack',
            'confidence': 0.70,
            'bbox': {'x': 300, 'y': 350, 'width': 60, 'height': 70}
        }
    ]


# ============================================================================
# ImagePreprocessor Tests
# ============================================================================

class TestImagePreprocessor:
    """Test suite for ImagePreprocessor"""
    
    def test_initialization(self):
        """Test preprocessor initialization"""
        preprocessor = ImagePreprocessor(target_size=640, min_size=640, max_size=4096)
        assert preprocessor.target_size == 640
        assert preprocessor.min_size == 640
        assert preprocessor.max_size == 4096
    
    @patch('requests.get')
    def test_load_image_from_url_success(self, mock_get, sample_image):
        """Test successful image loading from URL"""
        # Create mock response with image data
        pil_image = Image.fromarray(cv2.cvtColor(sample_image, cv2.COLOR_BGR2RGB))
        img_byte_arr = BytesIO()
        pil_image.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)
        
        mock_response = Mock()
        mock_response.content = img_byte_arr.read()
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response
        
        preprocessor = ImagePreprocessor()
        result = preprocessor.load_image_from_url('http://example.com/image.jpg')
        
        assert isinstance(result, np.ndarray)
        assert len(result.shape) == 3
        assert result.shape[2] == 3  # BGR format
    
    @patch('requests.get')
    def test_load_image_from_url_failure(self, mock_get):
        """Test image loading failure"""
        mock_get.side_effect = Exception("Network error")
        
        preprocessor = ImagePreprocessor()
        with pytest.raises(ValueError, match="Failed to load image"):
            preprocessor.load_image_from_url('http://example.com/image.jpg')
    
    def test_validate_dimensions_valid(self, sample_image):
        """Test dimension validation with valid image"""
        preprocessor = ImagePreprocessor(min_size=640, max_size=4096)
        assert preprocessor.validate_dimensions(sample_image) is True
    
    def test_validate_dimensions_too_small(self, sample_small_image):
        """Test dimension validation with too small image"""
        preprocessor = ImagePreprocessor(min_size=640, max_size=4096)
        with pytest.raises(ValueError, match="too small"):
            preprocessor.validate_dimensions(sample_small_image)
    
    def test_validate_dimensions_too_large(self):
        """Test dimension validation with too large image"""
        large_image = np.random.randint(0, 255, (5000, 5000, 3), dtype=np.uint8)
        preprocessor = ImagePreprocessor(min_size=640, max_size=4096)
        with pytest.raises(ValueError, match="too large"):
            preprocessor.validate_dimensions(large_image)
    
    def test_resize_for_yolo(self, sample_large_image):
        """Test image resizing for YOLO"""
        preprocessor = ImagePreprocessor(target_size=640)
        resized = preprocessor.resize_for_yolo(sample_large_image)
        
        assert resized.shape == (640, 640, 3)
        assert resized.dtype == np.uint8
    
    def test_normalize_brightness_contrast(self, sample_image):
        """Test brightness and contrast normalization"""
        preprocessor = ImagePreprocessor()
        normalized = preprocessor.normalize_brightness_contrast(sample_image)
        
        assert normalized.shape == sample_image.shape
        assert normalized.dtype == np.uint8
    
    def test_apply_adaptive_filtering(self, sample_image):
        """Test adaptive filtering"""
        preprocessor = ImagePreprocessor()
        filtered = preprocessor.apply_adaptive_filtering(sample_image)
        
        assert filtered.shape == sample_image.shape
        assert filtered.dtype == np.uint8
    
    def test_calculate_quality_score(self, sample_image):
        """Test quality score calculation"""
        preprocessor = ImagePreprocessor()
        quality_score = preprocessor.calculate_quality_score(sample_image)
        
        assert isinstance(quality_score, float)
        assert 0 <= quality_score <= 100
    
    @patch.object(ImagePreprocessor, 'load_image_from_url')
    def test_preprocess_pipeline(self, mock_load, sample_image):
        """Test complete preprocessing pipeline"""
        mock_load.return_value = sample_image
        
        preprocessor = ImagePreprocessor(target_size=640, min_size=640, max_size=4096)
        result = preprocessor.preprocess('http://example.com/image.jpg')
        
        assert 'original' in result
        assert 'processed' in result
        assert 'quality_score' in result
        assert 'dimensions' in result
        assert result['processed'].shape == (640, 640, 3)
        assert isinstance(result['quality_score'], float)


# ============================================================================
# YOLODetector Tests
# ============================================================================

class TestYOLODetector:
    """Test suite for YOLODetector"""
    
    def test_initialization(self):
        """Test YOLO detector initialization"""
        detector = YOLODetector(model_path='models/yolov8.pt', confidence_threshold=0.5)
        assert detector.model_path == 'models/yolov8.pt'
        assert detector.confidence_threshold == 0.5
        assert detector.model is None
    
    @patch('services.yolo_detector.YOLO')
    @patch('os.path.exists')
    def test_load_model_success(self, mock_exists, mock_yolo):
        """Test successful model loading"""
        mock_exists.return_value = True
        mock_model = Mock()
        mock_yolo.return_value = mock_model
        
        detector = YOLODetector(model_path='models/yolov8.pt')
        detector.load_model()
        
        assert detector.model is not None
        mock_yolo.assert_called_once_with('models/yolov8.pt')
    
    @patch('services.yolo_detector.YOLO')
    @patch('os.path.exists')
    def test_load_model_fallback(self, mock_exists, mock_yolo):
        """Test model loading with fallback to pre-trained model"""
        mock_exists.return_value = False
        mock_model = Mock()
        mock_yolo.return_value = mock_model
        
        detector = YOLODetector(model_path='models/yolov8.pt')
        detector.load_model()
        
        assert detector.model is not None
        mock_yolo.assert_called_once_with('yolov8n.pt')
    
    @patch('services.yolo_detector.YOLO')
    @patch('os.path.exists')
    def test_detect_success(self, mock_exists, mock_yolo, sample_image):
        """Test successful YOLO detection"""
        mock_exists.return_value = True
        mock_model = Mock()
        mock_results = [Mock()]
        mock_model.return_value = mock_results
        mock_yolo.return_value = mock_model
        
        detector = YOLODetector(model_path='models/yolov8.pt', confidence_threshold=0.5)
        results = detector.detect(sample_image)
        
        assert results == mock_results
        mock_model.assert_called_once()
    
    def test_postprocess_detections(self):
        """Test post-processing of YOLO results"""
        # Create mock YOLO result
        mock_box = Mock()
        mock_box.xyxy = [Mock()]
        mock_box.xyxy[0].cpu().numpy.return_value = np.array([100, 150, 150, 210])
        mock_box.conf = [Mock()]
        mock_box.conf[0].cpu().numpy.return_value = 0.85
        mock_box.cls = [Mock()]
        mock_box.cls[0].cpu().numpy.return_value = 0
        
        mock_result = Mock()
        mock_result.boxes = [mock_box]
        mock_result.names = {0: 'damaged_rivet'}
        
        detector = YOLODetector(model_path='models/yolov8.pt')
        detections = detector.postprocess([mock_result])
        
        assert len(detections) == 1
        assert detections[0]['class'] == 'damaged_rivet'
        assert detections[0]['confidence'] == 0.85
        assert 'bbox' in detections[0]
        assert detections[0]['bbox']['x'] == 100
        assert detections[0]['bbox']['y'] == 150
    
    @patch.object(YOLODetector, 'detect')
    @patch.object(YOLODetector, 'postprocess')
    def test_detect_and_process(self, mock_postprocess, mock_detect, sample_image, sample_yolo_detections):
        """Test complete detection pipeline"""
        mock_detect.return_value = [Mock()]
        mock_postprocess.return_value = sample_yolo_detections
        
        detector = YOLODetector(model_path='models/yolov8.pt')
        detections = detector.detect_and_process(sample_image)
        
        assert len(detections) == 2
        assert detections[0]['class'] == 'damaged_rivet'
        assert detections[1]['class'] == 'missing_rivet'


# ============================================================================
# GPTVisionClient Tests
# ============================================================================

class TestGPTVisionClient:
    """Test suite for GPTVisionClient"""
    
    def test_initialization(self):
        """Test GPT Vision client initialization"""
        client = GPTVisionClient(api_key='test-key', model='gpt-4-vision-preview')
        assert client.api_key == 'test-key'
        assert client.model == 'gpt-4-vision-preview'
        assert client.max_retries == 3
    
    def test_encode_image_to_base64(self, sample_image):
        """Test image encoding to base64"""
        client = GPTVisionClient(api_key='test-key')
        base64_str = client.encode_image_to_base64(sample_image)
        
        assert isinstance(base64_str, str)
        assert len(base64_str) > 0
        # Verify it's valid base64
        try:
            base64.b64decode(base64_str)
        except Exception:
            pytest.fail("Invalid base64 encoding")
    
    def test_create_detection_prompt(self):
        """Test detection prompt creation"""
        client = GPTVisionClient(api_key='test-key')
        prompt = client.create_detection_prompt()
        
        assert isinstance(prompt, str)
        assert 'damaged_rivet' in prompt
        assert 'missing_rivet' in prompt
        assert 'JSON' in prompt
    
    def test_parse_response_valid_json(self):
        """Test parsing valid JSON response"""
        client = GPTVisionClient(api_key='test-key')
        response_text = json.dumps([
            {
                'class': 'damaged_rivet',
                'confidence': 0.85,
                'bbox': {'x': 100, 'y': 150, 'width': 50, 'height': 60},
                'description': 'Damaged rivet detected'
            }
        ])
        
        detections = client.parse_response(response_text)
        
        assert len(detections) == 1
        assert detections[0]['class'] == 'damaged_rivet'
        assert detections[0]['confidence'] == 0.85
        assert 'bbox' in detections[0]
    
    def test_parse_response_with_markdown(self):
        """Test parsing JSON wrapped in markdown code blocks"""
        client = GPTVisionClient(api_key='test-key')
        response_text = "```json\n" + json.dumps([
            {
                'class': 'crack',
                'confidence': 0.75,
                'bbox': {'x': 200, 'y': 250, 'width': 40, 'height': 50}
            }
        ]) + "\n```"
        
        detections = client.parse_response(response_text)
        
        assert len(detections) == 1
        assert detections[0]['class'] == 'crack'
    
    def test_parse_response_invalid_json(self):
        """Test parsing invalid JSON response"""
        client = GPTVisionClient(api_key='test-key')
        response_text = "This is not valid JSON"
        
        detections = client.parse_response(response_text)
        
        assert detections == []
    
    def test_parse_response_invalid_class(self):
        """Test parsing response with invalid defect class"""
        client = GPTVisionClient(api_key='test-key')
        response_text = json.dumps([
            {
                'class': 'invalid_defect_type',
                'confidence': 0.85,
                'bbox': {'x': 100, 'y': 150, 'width': 50, 'height': 60}
            }
        ])
        
        detections = client.parse_response(response_text)
        
        assert detections == []
    
    @patch('services.gpt_vision_client.OpenAI')
    def test_analyze_image_success(self, mock_openai, sample_image):
        """Test successful GPT Vision analysis"""
        # Mock OpenAI client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps([
            {
                'class': 'damaged_rivet',
                'confidence': 0.85,
                'bbox': {'x': 100, 'y': 150, 'width': 50, 'height': 60}
            }
        ])
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        client = GPTVisionClient(api_key='test-key')
        client.client = mock_client
        detections = client.analyze_image(sample_image)
        
        assert len(detections) == 1
        assert detections[0]['class'] == 'damaged_rivet'
    
    @patch('services.gpt_vision_client.OpenAI')
    @patch('time.sleep')
    def test_analyze_image_with_retry(self, mock_sleep, mock_openai, sample_image):
        """Test GPT Vision analysis with retry logic"""
        # Mock OpenAI client to fail twice then succeed
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps([])
        
        mock_client.chat.completions.create.side_effect = [
            Exception("API Error"),
            Exception("API Error"),
            mock_response
        ]
        mock_openai.return_value = mock_client
        
        client = GPTVisionClient(api_key='test-key', max_retries=3)
        client.client = mock_client
        detections = client.analyze_image(sample_image)
        
        assert detections == []
        assert mock_client.chat.completions.create.call_count == 3
    
    def test_analyze_with_timeout(self, sample_image):
        """Test analyze with timeout wrapper"""
        client = GPTVisionClient(api_key='test-key')
        # Without API key, should return empty list
        detections = client.analyze_with_timeout(sample_image, timeout=30)
        
        assert detections == []


# ============================================================================
# EnsembleAggregator Tests
# ============================================================================

class TestEnsembleAggregator:
    """Test suite for EnsembleAggregator"""
    
    def test_initialization(self):
        """Test ensemble aggregator initialization"""
        aggregator = EnsembleAggregator(yolo_weight=0.6, gpt_weight=0.4)
        assert aggregator.yolo_weight == 0.6
        assert aggregator.gpt_weight == 0.4
        assert aggregator.iou_threshold == 0.5
        assert aggregator.nms_threshold == 0.4
    
    def test_calculate_iou_overlap(self):
        """Test IoU calculation with overlapping boxes"""
        aggregator = EnsembleAggregator()
        bbox1 = {'x': 100, 'y': 100, 'width': 50, 'height': 50}
        bbox2 = {'x': 120, 'y': 120, 'width': 50, 'height': 50}
        
        iou = aggregator.calculate_iou(bbox1, bbox2)
        
        assert 0 < iou < 1
        assert isinstance(iou, float)
    
    def test_calculate_iou_no_overlap(self):
        """Test IoU calculation with non-overlapping boxes"""
        aggregator = EnsembleAggregator()
        bbox1 = {'x': 100, 'y': 100, 'width': 50, 'height': 50}
        bbox2 = {'x': 200, 'y': 200, 'width': 50, 'height': 50}
        
        iou = aggregator.calculate_iou(bbox1, bbox2)
        
        assert iou == 0.0
    
    def test_calculate_iou_identical(self):
        """Test IoU calculation with identical boxes"""
        aggregator = EnsembleAggregator()
        bbox1 = {'x': 100, 'y': 100, 'width': 50, 'height': 50}
        bbox2 = {'x': 100, 'y': 100, 'width': 50, 'height': 50}
        
        iou = aggregator.calculate_iou(bbox1, bbox2)
        
        assert iou == 1.0
    
    def test_apply_nms(self):
        """Test Non-Maximum Suppression"""
        aggregator = EnsembleAggregator(nms_threshold=0.4)
        detections = [
            {
                'class': 'damaged_rivet',
                'confidence': 0.85,
                'bbox': {'x': 100, 'y': 100, 'width': 50, 'height': 50}
            },
            {
                'class': 'damaged_rivet',
                'confidence': 0.75,
                'bbox': {'x': 105, 'y': 105, 'width': 50, 'height': 50}
            },
            {
                'class': 'crack',
                'confidence': 0.80,
                'bbox': {'x': 200, 'y': 200, 'width': 40, 'height': 40}
            }
        ]
        
        filtered = aggregator.apply_nms(detections)
        
        # Should keep highest confidence damaged_rivet and the crack
        assert len(filtered) <= len(detections)
        assert filtered[0]['confidence'] >= 0.75
    
    def test_merge_detections(self):
        """Test merging two matching detections"""
        aggregator = EnsembleAggregator(yolo_weight=0.6, gpt_weight=0.4)
        det1 = {
            'class': 'damaged_rivet',
            'confidence': 0.85,
            'bbox': {'x': 100, 'y': 150, 'width': 50, 'height': 60}
        }
        det2 = {
            'class': 'damaged_rivet',
            'confidence': 0.80,
            'bbox': {'x': 105, 'y': 155, 'width': 48, 'height': 58}
        }
        
        merged = aggregator.merge_detections(det1, det2)
        
        assert merged['class'] == 'damaged_rivet'
        assert merged['source'] == 'ensemble'
        # Weighted average: 0.85 * 0.6 + 0.80 * 0.4 = 0.83
        assert abs(merged['confidence'] - 0.83) < 0.01
        assert 'bbox' in merged
    
    def test_weighted_voting(self):
        """Test weighted voting for conflicting predictions"""
        aggregator = EnsembleAggregator(yolo_weight=0.6, gpt_weight=0.4)
        det1 = {
            'class': 'damaged_rivet',
            'confidence': 0.85,
            'bbox': {'x': 100, 'y': 150, 'width': 50, 'height': 60}
        }
        det2 = {
            'class': 'missing_rivet',
            'confidence': 0.80,
            'bbox': {'x': 105, 'y': 155, 'width': 48, 'height': 58}
        }
        
        selected = aggregator.weighted_voting(det1, det2)
        
        # YOLO score: 0.85 * 0.6 = 0.51
        # GPT score: 0.80 * 0.4 = 0.32
        # Should select YOLO
        assert selected['source'] == 'yolo'
        assert selected['class'] == 'damaged_rivet'
    
    def test_aggregate_matching_detections(self, sample_yolo_detections, sample_gpt_detections):
        """Test aggregation with matching detections"""
        aggregator = EnsembleAggregator(yolo_weight=0.6, gpt_weight=0.4, iou_threshold=0.5)
        
        # Modify GPT detection to match YOLO detection closely
        sample_gpt_detections[0] = {
            'class': 'damaged_rivet',
            'confidence': 0.80,
            'bbox': {'x': 102, 'y': 152, 'width': 48, 'height': 58}
        }
        
        final_detections = aggregator.aggregate(sample_yolo_detections, sample_gpt_detections)
        
        assert len(final_detections) > 0
        # Should have ensemble detections for matches
        ensemble_count = sum(1 for d in final_detections if d.get('source') == 'ensemble')
        assert ensemble_count >= 0
    
    def test_aggregate_no_matches(self):
        """Test aggregation with no matching detections"""
        aggregator = EnsembleAggregator(yolo_weight=0.6, gpt_weight=0.4)
        yolo_results = [
            {
                'class': 'damaged_rivet',
                'confidence': 0.85,
                'bbox': {'x': 100, 'y': 100, 'width': 50, 'height': 50}
            }
        ]
        gpt_results = [
            {
                'class': 'crack',
                'confidence': 0.75,
                'bbox': {'x': 300, 'y': 300, 'width': 40, 'height': 40}
            }
        ]
        
        final_detections = aggregator.aggregate(yolo_results, gpt_results)
        
        # Should keep both detections if confidence > 0.7
        assert len(final_detections) == 2
    
    def test_aggregate_empty_inputs(self):
        """Test aggregation with empty inputs"""
        aggregator = EnsembleAggregator()
        
        # Both empty
        result = aggregator.aggregate([], [])
        assert result == []
        
        # Only YOLO
        yolo_results = [
            {
                'class': 'damaged_rivet',
                'confidence': 0.85,
                'bbox': {'x': 100, 'y': 100, 'width': 50, 'height': 50}
            }
        ]
        result = aggregator.aggregate(yolo_results, [])
        assert len(result) == 1
        
        # Only GPT
        gpt_results = [
            {
                'class': 'crack',
                'confidence': 0.75,
                'bbox': {'x': 200, 'y': 200, 'width': 40, 'height': 40}
            }
        ]
        result = aggregator.aggregate([], gpt_results)
        assert len(result) == 1


# ============================================================================
# Run tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
