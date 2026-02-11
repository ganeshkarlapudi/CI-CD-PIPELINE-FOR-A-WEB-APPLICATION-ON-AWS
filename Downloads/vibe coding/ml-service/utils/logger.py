"""
Logging utilities for ML service
"""

import logging
import sys
from datetime import datetime


def setup_logger(name='ml-service', level=logging.INFO):
    """
    Set up and configure logger
    
    Args:
        name: Logger name
        level: Logging level
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Remove existing handlers
    logger.handlers = []
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    return logger


def log_request(logger, endpoint, method, data=None):
    """
    Log incoming request
    
    Args:
        logger: Logger instance
        endpoint: API endpoint
        method: HTTP method
        data: Request data (optional)
    """
    logger.info(f"Request: {method} {endpoint}")
    if data:
        logger.debug(f"Request data: {data}")


def log_response(logger, endpoint, status_code, processing_time=None):
    """
    Log response
    
    Args:
        logger: Logger instance
        endpoint: API endpoint
        status_code: HTTP status code
        processing_time: Processing time in seconds (optional)
    """
    message = f"Response: {endpoint} - Status: {status_code}"
    if processing_time:
        message += f" - Time: {processing_time:.2f}s"
    logger.info(message)


def log_error(logger, error, context=None):
    """
    Log error with context
    
    Args:
        logger: Logger instance
        error: Error object or message
        context: Additional context (optional)
    """
    error_msg = f"Error: {str(error)}"
    if context:
        error_msg += f" - Context: {context}"
    logger.error(error_msg, exc_info=True)
