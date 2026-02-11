"""
YOLOv8 Model Training Script
Trains YOLOv8 model on aircraft defect detection dataset
"""

import os
import sys
import argparse
import json
from datetime import datetime
from pathlib import Path
import yaml

from ultralytics import YOLO
import torch
from pymongo import MongoClient
import boto3
from botocore.exceptions import ClientError

from utils.logger import setup_logger
from utils.config import Config

# Setup logger
logger = setup_logger('model-training')


class ModelTrainer:
    """
    YOLOv8 model trainer for aircraft defect detection
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
    
    def __init__(self, config):
        """
        Initialize model trainer
        
        Args:
            config: Training configuration dictionary
        """
        self.config = config
        self.model = None
        self.results = None
        
        # MongoDB connection
        self.mongo_client = None
        self.db = None
        
        # S3 client
        self.s3_client = None
        
        logger.info("ModelTrainer initialized")
    
    def connect_mongodb(self):
        """Connect to MongoDB database"""
        try:
            mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/aircraft_detection')
            logger.info(f"Connecting to MongoDB: {mongodb_uri}")
            
            self.mongo_client = MongoClient(mongodb_uri)
            db_name = mongodb_uri.split('/')[-1].split('?')[0]
            self.db = self.mongo_client[db_name]
            
            # Test connection
            self.mongo_client.admin.command('ping')
            logger.info("MongoDB connection successful")
            
        except Exception as e:
            logger.error(f"MongoDB connection failed: {str(e)}")
            raise
    
    def connect_s3(self):
        """Connect to AWS S3"""
        try:
            use_local_storage = os.getenv('USE_LOCAL_STORAGE', 'true').lower() == 'true'
            
            if use_local_storage:
                logger.info("Using local storage (S3 disabled)")
                return
            
            aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            aws_region = os.getenv('AWS_REGION', 'us-east-1')
            
            if not aws_access_key or not aws_secret_key:
                logger.warning("AWS credentials not configured, using local storage")
                return
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            logger.info("S3 client initialized")
            
        except Exception as e:
            logger.error(f"S3 connection failed: {str(e)}")
            logger.warning("Falling back to local storage")
    
    def prepare_dataset(self, dataset_path):
        """
        Prepare and validate dataset for training
        
        Args:
            dataset_path: Path to dataset directory
            
        Returns:
            dict: Dataset information
        """
        logger.info(f"Preparing dataset from: {dataset_path}")
        
        dataset_path = Path(dataset_path)
        
        # Check dataset structure
        required_dirs = ['train/images', 'train/labels', 'val/images', 'val/labels']
        for dir_name in required_dirs:
            dir_path = dataset_path / dir_name
            if not dir_path.exists():
                raise ValueError(f"Required directory not found: {dir_path}")
        
        # Count images
        train_images = list((dataset_path / 'train/images').glob('*'))
        val_images = list((dataset_path / 'val/images').glob('*'))
        
        total_images = len(train_images) + len(val_images)
        train_split = len(train_images) / total_images if total_images > 0 else 0
        val_split = len(val_images) / total_images if total_images > 0 else 0
        
        dataset_info = {
            'totalImages': total_images,
            'trainImages': len(train_images),
            'valImages': len(val_images),
            'trainSplit': round(train_split, 2),
            'valSplit': round(val_split, 2),
            'classes': self.CLASS_NAMES
        }
        
        logger.info(f"Dataset prepared: {dataset_info}")
        
        return dataset_info
    
    def create_dataset_yaml(self, dataset_path, output_path='dataset.yaml'):
        """
        Create YOLO dataset configuration file
        
        Args:
            dataset_path: Path to dataset directory
            output_path: Output path for YAML file
        """
        dataset_path = Path(dataset_path).absolute()
        
        dataset_config = {
            'path': str(dataset_path),
            'train': 'train/images',
            'val': 'val/images',
            'nc': len(self.CLASS_NAMES),
            'names': self.CLASS_NAMES
        }
        
        output_path = Path(output_path)
        with open(output_path, 'w') as f:
            yaml.dump(dataset_config, f, default_flow_style=False)
        
        logger.info(f"Dataset YAML created: {output_path}")
        
        return str(output_path)
    
    def train(self, dataset_yaml_path):
        """
        Train YOLOv8 model
        
        Args:
            dataset_yaml_path: Path to dataset YAML configuration
            
        Returns:
            dict: Training results
        """
        logger.info("=" * 60)
        logger.info("Starting YOLOv8 Training")
        logger.info("=" * 60)
        
        # Log training configuration
        logger.info("Training Configuration:")
        for key, value in self.config.items():
            logger.info(f"  {key}: {value}")
        
        # Initialize model
        base_model = self.config.get('base_model', 'yolov8n.pt')
        logger.info(f"Loading base model: {base_model}")
        self.model = YOLO(base_model)
        
        # Training parameters
        train_params = {
            'data': dataset_yaml_path,
            'epochs': self.config.get('epochs', 100),
            'batch': self.config.get('batch_size', 16),
            'imgsz': self.config.get('image_size', 640),
            'lr0': self.config.get('learning_rate', 0.01),
            'device': self.config.get('device', 'cpu'),
            'project': self.config.get('project_dir', 'runs/train'),
            'name': self.config.get('run_name', 'aircraft_defect'),
            'exist_ok': True,
            'patience': self.config.get('patience', 50),
            'save': True,
            'save_period': self.config.get('save_period', 10),
            'cache': False,
            'workers': self.config.get('workers', 8),
            'verbose': True,
        }
        
        # Data augmentation settings
        if self.config.get('augmentation', True):
            train_params.update({
                'hsv_h': 0.015,  # HSV-Hue augmentation
                'hsv_s': 0.7,    # HSV-Saturation augmentation
                'hsv_v': 0.4,    # HSV-Value augmentation
                'degrees': 10.0,  # Rotation
                'translate': 0.1, # Translation
                'scale': 0.5,     # Scaling
                'shear': 0.0,     # Shear
                'perspective': 0.0, # Perspective
                'flipud': 0.0,    # Flip up-down
                'fliplr': 0.5,    # Flip left-right
                'mosaic': 1.0,    # Mosaic augmentation
                'mixup': 0.0,     # Mixup augmentation
            })
        
        logger.info("Starting training...")
        logger.info(f"Training on device: {train_params['device']}")
        
        # Train model
        try:
            self.results = self.model.train(**train_params)
            logger.info("Training completed successfully")
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            raise
        
        return self.results
    
    def validate(self):
        """
        Validate trained model and calculate metrics
        
        Returns:
            dict: Validation metrics
        """
        logger.info("=" * 60)
        logger.info("Validating Model")
        logger.info("=" * 60)
        
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        try:
            # Run validation
            val_results = self.model.val()
            
            # Extract metrics
            metrics = {
                'mAP': float(val_results.box.map),  # mAP@0.5:0.95
                'mAP50': float(val_results.box.map50),  # mAP@0.5
                'mAP75': float(val_results.box.map75),  # mAP@0.75
                'precision': float(val_results.box.mp),
                'recall': float(val_results.box.mr),
                'f1Score': float(2 * val_results.box.mp * val_results.box.mr / (val_results.box.mp + val_results.box.mr)) if (val_results.box.mp + val_results.box.mr) > 0 else 0.0
            }
            
            # Per-class metrics
            class_metrics = []
            if hasattr(val_results.box, 'maps') and val_results.box.maps is not None:
                for i, class_name in enumerate(self.CLASS_NAMES):
                    if i < len(val_results.box.maps):
                        class_metrics.append({
                            'class': class_name,
                            'ap': float(val_results.box.maps[i]),
                            'precision': float(val_results.box.p[i]) if hasattr(val_results.box, 'p') and i < len(val_results.box.p) else 0.0,
                            'recall': float(val_results.box.r[i]) if hasattr(val_results.box, 'r') and i < len(val_results.box.r) else 0.0
                        })
            
            metrics['classMetrics'] = class_metrics
            
            logger.info("Validation Metrics:")
            logger.info(f"  mAP@0.5:0.95: {metrics['mAP']:.4f}")
            logger.info(f"  mAP@0.5: {metrics['mAP50']:.4f}")
            logger.info(f"  Precision: {metrics['precision']:.4f}")
            logger.info(f"  Recall: {metrics['recall']:.4f}")
            logger.info(f"  F1 Score: {metrics['f1Score']:.4f}")
            
            # Check if model meets deployment criteria (mAP >= 0.95)
            if metrics['mAP50'] >= 0.95:
                logger.info("✓ Model meets deployment criteria (mAP@0.5 >= 0.95)")
            else:
                logger.warning(f"✗ Model does not meet deployment criteria (mAP@0.5 = {metrics['mAP50']:.4f} < 0.95)")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            raise
    
    def save_weights(self, output_path='best.pt'):
        """
        Save trained model weights
        
        Args:
            output_path: Output path for weights file
            
        Returns:
            str: Path to saved weights
        """
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        try:
            # Get best weights from training
            best_weights = Path(self.model.trainer.best)
            
            # Copy to output path
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            import shutil
            shutil.copy(best_weights, output_path)
            
            logger.info(f"Model weights saved: {output_path}")
            
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to save weights: {str(e)}")
            raise
    
    def upload_to_s3(self, local_path, s3_key):
        """
        Upload model weights to S3
        
        Args:
            local_path: Local file path
            s3_key: S3 object key
            
        Returns:
            str: S3 URL or local path
        """
        use_local_storage = os.getenv('USE_LOCAL_STORAGE', 'true').lower() == 'true'
        
        if use_local_storage or self.s3_client is None:
            logger.info(f"Using local storage: {local_path}")
            return f"file://{os.path.abspath(local_path)}"
        
        try:
            bucket_name = os.getenv('AWS_S3_BUCKET')
            
            if not bucket_name:
                logger.warning("S3 bucket not configured, using local storage")
                return f"file://{os.path.abspath(local_path)}"
            
            logger.info(f"Uploading to S3: s3://{bucket_name}/{s3_key}")
            
            self.s3_client.upload_file(
                local_path,
                bucket_name,
                s3_key,
                ExtraArgs={'ContentType': 'application/octet-stream'}
            )
            
            s3_url = f"s3://{bucket_name}/{s3_key}"
            logger.info(f"Upload successful: {s3_url}")
            
            return s3_url
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {str(e)}")
            logger.warning("Falling back to local storage")
            return f"file://{os.path.abspath(local_path)}"
    
    def update_mongodb(self, version, metrics, weights_url, dataset_info, created_by=None):
        """
        Update MongoDB with training results
        
        Args:
            version: Model version string
            metrics: Validation metrics dictionary
            weights_url: URL to model weights
            dataset_info: Dataset information dictionary
            created_by: User ID who initiated training
            
        Returns:
            str: Model document ID
        """
        if self.db is None:
            raise ValueError("MongoDB not connected")
        
        try:
            logger.info("Updating MongoDB with training results...")
            
            # Prepare model document
            model_doc = {
                'version': version,
                'type': 'yolov8',
                'status': 'validating',
                'metrics': {
                    'mAP': metrics.get('mAP'),
                    'precision': metrics.get('precision'),
                    'recall': metrics.get('recall'),
                    'f1Score': metrics.get('f1Score'),
                    'classMetrics': metrics.get('classMetrics', [])
                },
                'trainingConfig': {
                    'epochs': self.config.get('epochs'),
                    'batchSize': self.config.get('batch_size'),
                    'learningRate': self.config.get('learning_rate'),
                    'imageSize': self.config.get('image_size'),
                    'augmentation': self.config.get('augmentation', {})
                },
                'datasetInfo': {
                    'totalImages': dataset_info.get('totalImages'),
                    'trainSplit': dataset_info.get('trainSplit'),
                    'valSplit': dataset_info.get('valSplit'),
                    'classes': dataset_info.get('classes', [])
                },
                'weightsUrl': weights_url,
                'createdBy': created_by,
                'createdAt': datetime.utcnow(),
                'deployedAt': None
            }
            
            # Insert into models collection
            result = self.db.models.insert_one(model_doc)
            model_id = str(result.inserted_id)
            
            logger.info(f"Model document created: {model_id}")
            logger.info(f"Model version: {version}")
            
            return model_id
            
        except Exception as e:
            logger.error(f"MongoDB update failed: {str(e)}")
            raise
    
    def cleanup(self):
        """Cleanup resources"""
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB connection closed")


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Train YOLOv8 model for aircraft defect detection')
    
    # Required arguments
    parser.add_argument('--dataset', type=str, required=True,
                        help='Path to dataset directory')
    parser.add_argument('--version', type=str, required=True,
                        help='Model version (e.g., v1.0.0)')
    
    # Training hyperparameters
    parser.add_argument('--epochs', type=int, default=100,
                        help='Number of training epochs (default: 100)')
    parser.add_argument('--batch-size', type=int, default=16,
                        help='Batch size (default: 16)')
    parser.add_argument('--learning-rate', type=float, default=0.01,
                        help='Initial learning rate (default: 0.01)')
    parser.add_argument('--image-size', type=int, default=640,
                        help='Image size for training (default: 640)')
    parser.add_argument('--device', type=str, default='cpu',
                        help='Device for training: cpu, cuda, mps (default: cpu)')
    
    # Model configuration
    parser.add_argument('--base-model', type=str, default='yolov8n.pt',
                        help='Base model: yolov8n.pt, yolov8s.pt, yolov8m.pt, yolov8l.pt (default: yolov8n.pt)')
    parser.add_argument('--no-augmentation', action='store_true',
                        help='Disable data augmentation')
    
    # Output configuration
    parser.add_argument('--output-dir', type=str, default='models',
                        help='Output directory for model weights (default: models)')
    parser.add_argument('--project-dir', type=str, default='runs/train',
                        help='Project directory for training runs (default: runs/train)')
    parser.add_argument('--run-name', type=str, default='aircraft_defect',
                        help='Run name (default: aircraft_defect)')
    
    # Optional
    parser.add_argument('--created-by', type=str, default=None,
                        help='User ID who initiated training')
    parser.add_argument('--workers', type=int, default=8,
                        help='Number of data loading workers (default: 8)')
    parser.add_argument('--patience', type=int, default=50,
                        help='Early stopping patience (default: 50)')
    parser.add_argument('--save-period', type=int, default=10,
                        help='Save checkpoint every N epochs (default: 10)')
    
    return parser.parse_args()


def main():
    """Main training workflow"""
    try:
        # Parse arguments
        args = parse_arguments()
        
        logger.info("=" * 60)
        logger.info("YOLOv8 Aircraft Defect Detection - Model Training")
        logger.info("=" * 60)
        
        # Prepare training configuration
        config = {
            'epochs': args.epochs,
            'batch_size': args.batch_size,
            'learning_rate': args.learning_rate,
            'image_size': args.image_size,
            'device': args.device,
            'base_model': args.base_model,
            'augmentation': not args.no_augmentation,
            'project_dir': args.project_dir,
            'run_name': args.run_name,
            'workers': args.workers,
            'patience': args.patience,
            'save_period': args.save_period
        }
        
        # Initialize trainer
        trainer = ModelTrainer(config)
        
        # Connect to services
        trainer.connect_mongodb()
        trainer.connect_s3()
        
        # Prepare dataset
        dataset_info = trainer.prepare_dataset(args.dataset)
        
        # Create dataset YAML
        dataset_yaml = trainer.create_dataset_yaml(args.dataset)
        
        # Train model
        trainer.train(dataset_yaml)
        
        # Validate model
        metrics = trainer.validate()
        
        # Save weights
        output_path = os.path.join(args.output_dir, f'{args.version}.pt')
        weights_path = trainer.save_weights(output_path)
        
        # Upload to S3
        s3_key = f'models/{args.version}.pt'
        weights_url = trainer.upload_to_s3(weights_path, s3_key)
        
        # Update MongoDB
        model_id = trainer.update_mongodb(
            version=args.version,
            metrics=metrics,
            weights_url=weights_url,
            dataset_info=dataset_info,
            created_by=args.created_by
        )
        
        logger.info("=" * 60)
        logger.info("Training Workflow Completed Successfully")
        logger.info("=" * 60)
        logger.info(f"Model ID: {model_id}")
        logger.info(f"Model Version: {args.version}")
        logger.info(f"mAP@0.5:0.95: {metrics['mAP']:.4f}")
        logger.info(f"mAP@0.5: {metrics.get('mAP50', 0):.4f}")
        logger.info(f"Weights URL: {weights_url}")
        logger.info("=" * 60)
        
        # Cleanup
        trainer.cleanup()
        
        return 0
        
    except Exception as e:
        logger.error(f"Training workflow failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return 1


if __name__ == '__main__':
    sys.exit(main())
