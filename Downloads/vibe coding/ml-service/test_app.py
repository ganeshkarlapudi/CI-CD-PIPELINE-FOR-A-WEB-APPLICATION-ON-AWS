"""
Simple test script to verify Flask app initialization
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    # Test imports
    print("Testing imports...")
    from utils.config import Config
    from utils.logger import setup_logger
    print("✓ Imports successful")
    
    # Test configuration
    print("\nTesting configuration...")
    config_summary = Config.get_config_summary()
    print(f"✓ Configuration loaded: {config_summary['environment']}")
    
    # Test logger
    print("\nTesting logger...")
    logger = setup_logger('test')
    logger.info("Test log message")
    print("✓ Logger working")
    
    # Test Flask app creation
    print("\nTesting Flask app...")
    from app import app
    print(f"✓ Flask app created: {app.name}")
    
    # Test health endpoint
    print("\nTesting health endpoint...")
    with app.test_client() as client:
        response = client.get('/health')
        if response.status_code == 200:
            data = response.get_json()
            print(f"✓ Health endpoint working: {data['status']}")
        else:
            print(f"✗ Health endpoint failed: {response.status_code}")
            sys.exit(1)
    
    # Test ready endpoint
    print("\nTesting ready endpoint...")
    with app.test_client() as client:
        response = client.get('/ready')
        data = response.get_json()
        print(f"✓ Ready endpoint working: {data['status']}")
        if response.status_code == 503:
            print("  Note: Service not fully ready (expected without model/API key)")
    
    print("\n" + "=" * 60)
    print("All tests passed! Flask application is properly initialized.")
    print("=" * 60)
    
except Exception as e:
    print(f"\n✗ Test failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
