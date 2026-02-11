# ML Service Unit Tests

## Overview

This document describes the unit tests for the Aircraft Defect Detection ML Service. The tests cover all core components including image preprocessing, YOLO detection, GPT Vision API client, and ensemble aggregation.

## Test Coverage

### Test File: `test_ml_service.py`

Total Tests: **37 tests** covering 4 main components

## Components Tested

### 1. ImagePreprocessor (11 tests)

Tests for image loading, validation, preprocessing, and quality assessment.

**Test Cases:**
- `test_initialization` - Verifies preprocessor initialization with correct parameters
- `test_load_image_from_url_success` - Tests successful image loading from URL
- `test_load_image_from_url_failure` - Tests error handling for failed image downloads
- `test_validate_dimensions_valid` - Tests dimension validation with valid images
- `test_validate_dimensions_too_small` - Tests rejection of images below minimum size
- `test_validate_dimensions_too_large` - Tests rejection of images above maximum size
- `test_resize_for_yolo` - Tests image resizing to YOLO input size (640x640)
- `test_normalize_brightness_contrast` - Tests CLAHE brightness/contrast normalization
- `test_apply_adaptive_filtering` - Tests adaptive filtering for glare and shadow reduction
- `test_calculate_quality_score` - Tests image quality score calculation (0-100)
- `test_preprocess_pipeline` - Tests complete preprocessing pipeline integration

**Requirements Covered:** 15.1, 15.2, 15.3, 15.4, 15.5

### 2. YOLODetector (6 tests)

Tests for YOLOv8 model loading, inference, and post-processing.

**Test Cases:**
- `test_initialization` - Verifies detector initialization with model path and threshold
- `test_load_model_success` - Tests successful model loading from file
- `test_load_model_fallback` - Tests fallback to pre-trained model when custom model missing
- `test_detect_success` - Tests YOLO inference on sample images
- `test_postprocess_detections` - Tests extraction of bounding boxes and classes from results
- `test_detect_and_process` - Tests complete detection pipeline (inference + post-processing)

**Requirements Covered:** 5.1, 12.5

### 3. GPTVisionClient (10 tests)

Tests for GPT-4 Vision API integration, response parsing, and retry logic.

**Test Cases:**
- `test_initialization` - Verifies client initialization with API key and model
- `test_encode_image_to_base64` - Tests image encoding to base64 format
- `test_create_detection_prompt` - Tests prompt generation for defect detection
- `test_parse_response_valid_json` - Tests parsing of valid JSON responses
- `test_parse_response_with_markdown` - Tests parsing JSON wrapped in markdown code blocks
- `test_parse_response_invalid_json` - Tests handling of malformed JSON responses
- `test_parse_response_invalid_class` - Tests rejection of unknown defect classes
- `test_analyze_image_success` - Tests successful GPT Vision API call
- `test_analyze_image_with_retry` - Tests retry logic with exponential backoff
- `test_analyze_with_timeout` - Tests timeout wrapper for API calls

**Requirements Covered:** 5.2

### 4. EnsembleAggregator (10 tests)

Tests for ensemble model aggregation, IoU calculation, NMS, and weighted voting.

**Test Cases:**
- `test_initialization` - Verifies aggregator initialization with weights and thresholds
- `test_calculate_iou_overlap` - Tests IoU calculation for overlapping bounding boxes
- `test_calculate_iou_no_overlap` - Tests IoU calculation for non-overlapping boxes
- `test_calculate_iou_identical` - Tests IoU calculation for identical boxes (should be 1.0)
- `test_apply_nms` - Tests Non-Maximum Suppression for duplicate removal
- `test_merge_detections` - Tests merging of matching detections from both models
- `test_weighted_voting` - Tests weighted voting for conflicting predictions
- `test_aggregate_matching_detections` - Tests aggregation when models agree
- `test_aggregate_no_matches` - Tests aggregation when models detect different defects
- `test_aggregate_empty_inputs` - Tests handling of empty detection lists

**Requirements Covered:** 5.3, 5.4, 5.5

## Running the Tests

### Prerequisites

Install test dependencies:
```bash
pip install pytest pytest-mock
```

### Run All Tests

```bash
# From ml-service directory
python -m pytest test_ml_service.py -v
```

### Run Specific Test Class

```bash
# Test only ImagePreprocessor
python -m pytest test_ml_service.py::TestImagePreprocessor -v

# Test only YOLODetector
python -m pytest test_ml_service.py::TestYOLODetector -v

# Test only GPTVisionClient
python -m pytest test_ml_service.py::TestGPTVisionClient -v

# Test only EnsembleAggregator
python -m pytest test_ml_service.py::TestEnsembleAggregator -v
```

### Run Specific Test

```bash
python -m pytest test_ml_service.py::TestImagePreprocessor::test_preprocess_pipeline -v
```

### Run with Coverage Report

```bash
python -m pytest test_ml_service.py --cov=services --cov-report=html
```

## Test Strategy

### Mocking Strategy

The tests use mocking extensively to avoid dependencies on:
- External ML libraries (ultralytics, torch)
- OpenAI API (no actual API calls made)
- Network requests (image downloads mocked)
- File system (model loading mocked)

This ensures tests run quickly and don't require:
- GPU/CUDA
- OpenAI API keys
- Internet connection
- Large model files

### Test Data

Tests use synthetic test data:
- **Sample images**: Generated using NumPy random arrays
- **Mock detections**: Predefined detection dictionaries
- **Mock API responses**: JSON strings with expected format

### Error Handling

Tests verify proper error handling for:
- Network failures
- Invalid image formats
- Out-of-range dimensions
- Malformed API responses
- Missing model files
- API timeouts and retries

## Test Results

All 37 tests pass successfully:

```
================================== 37 passed in 1.73s ====================================
```

### Coverage Summary

- **ImagePreprocessor**: 11/11 tests passing (100%)
- **YOLODetector**: 6/6 tests passing (100%)
- **GPTVisionClient**: 10/10 tests passing (100%)
- **EnsembleAggregator**: 10/10 tests passing (100%)

## Key Testing Insights

### 1. Image Preprocessing
- Validates images are within acceptable size range (640x640 to 4096x4096)
- Applies CLAHE for brightness/contrast normalization
- Uses bilateral filtering for glare/shadow reduction
- Calculates quality scores based on sharpness and brightness

### 2. YOLO Detection
- Supports fallback to pre-trained model for development
- Post-processes results into standardized format
- Handles multiple detections per image
- Maps class indices to defect names

### 3. GPT Vision Integration
- Encodes images to base64 for API transmission
- Parses JSON responses with markdown code block handling
- Implements retry logic with exponential backoff (max 3 retries)
- Validates defect classes against allowed list

### 4. Ensemble Aggregation
- Uses IoU threshold (0.5) to match detections between models
- Applies weighted voting (YOLO: 0.6, GPT: 0.4) for conflicts
- Merges matching detections by averaging confidence and bbox
- Applies NMS (threshold 0.4) to remove duplicates
- Keeps high-confidence unmatched detections (>0.7)

## Future Enhancements

Potential areas for additional testing:
1. Integration tests with real model files
2. Performance benchmarking tests
3. Load testing for concurrent requests
4. End-to-end tests with actual images
5. API contract tests for GPT Vision responses
6. Memory usage and leak detection tests

## Maintenance

When updating ML service code:
1. Run tests before committing changes
2. Update tests if API contracts change
3. Add new tests for new functionality
4. Maintain test coverage above 90%
5. Document any new test fixtures or mocks
