"""
Dataset Preparation Script
Prepares and validates dataset for YOLOv8 training
"""

import os
import sys
import argparse
import shutil
from pathlib import Path
from collections import defaultdict
import json

from utils.logger import setup_logger

logger = setup_logger('dataset-preparation')


class DatasetPreparator:
    """
    Dataset preparation and validation for YOLOv8 training
    """
    
    # Expected defect classes
    EXPECTED_CLASSES = [
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
    
    def __init__(self, source_dir, output_dir, train_split=0.8):
        """
        Initialize dataset preparator
        
        Args:
            source_dir: Source directory containing images and labels
            output_dir: Output directory for prepared dataset
            train_split: Training split ratio (default: 0.8)
        """
        self.source_dir = Path(source_dir)
        self.output_dir = Path(output_dir)
        self.train_split = train_split
        
        logger.info(f"DatasetPreparator initialized")
        logger.info(f"  Source: {self.source_dir}")
        logger.info(f"  Output: {self.output_dir}")
        logger.info(f"  Train split: {self.train_split}")
    
    def validate_source_structure(self):
        """
        Validate source directory structure
        
        Expected structure:
        source_dir/
          images/
            image1.jpg
            image2.jpg
          labels/
            image1.txt
            image2.txt
        """
        logger.info("Validating source directory structure...")
        
        if not self.source_dir.exists():
            raise ValueError(f"Source directory does not exist: {self.source_dir}")
        
        images_dir = self.source_dir / 'images'
        labels_dir = self.source_dir / 'labels'
        
        if not images_dir.exists():
            raise ValueError(f"Images directory not found: {images_dir}")
        
        if not labels_dir.exists():
            raise ValueError(f"Labels directory not found: {labels_dir}")
        
        # Count files
        image_files = list(images_dir.glob('*.[jJ][pP][gG]')) + \
                     list(images_dir.glob('*.[pP][nN][gG]')) + \
                     list(images_dir.glob('*.[tT][iI][fF]')) + \
                     list(images_dir.glob('*.[tT][iI][fF][fF]'))
        
        label_files = list(labels_dir.glob('*.txt'))
        
        logger.info(f"Found {len(image_files)} images")
        logger.info(f"Found {len(label_files)} label files")
        
        if len(image_files) == 0:
            raise ValueError("No image files found")
        
        if len(label_files) == 0:
            raise ValueError("No label files found")
        
        return image_files, label_files
    
    def validate_labels(self, label_files):
        """
        Validate label files format and content
        
        Args:
            label_files: List of label file paths
            
        Returns:
            dict: Validation statistics
        """
        logger.info("Validating label files...")
        
        stats = {
            'total_labels': 0,
            'valid_labels': 0,
            'invalid_labels': 0,
            'class_distribution': defaultdict(int),
            'errors': []
        }
        
        for label_file in label_files:
            try:
                with open(label_file, 'r') as f:
                    lines = f.readlines()
                
                for line_num, line in enumerate(lines, 1):
                    stats['total_labels'] += 1
                    
                    # Parse YOLO format: class_id x_center y_center width height
                    parts = line.strip().split()
                    
                    if len(parts) != 5:
                        stats['invalid_labels'] += 1
                        stats['errors'].append(f"{label_file.name}:{line_num} - Invalid format (expected 5 values)")
                        continue
                    
                    try:
                        class_id = int(parts[0])
                        x_center = float(parts[1])
                        y_center = float(parts[2])
                        width = float(parts[3])
                        height = float(parts[4])
                        
                        # Validate ranges
                        if class_id < 0 or class_id >= len(self.EXPECTED_CLASSES):
                            stats['invalid_labels'] += 1
                            stats['errors'].append(f"{label_file.name}:{line_num} - Invalid class ID: {class_id}")
                            continue
                        
                        if not (0 <= x_center <= 1 and 0 <= y_center <= 1 and 0 <= width <= 1 and 0 <= height <= 1):
                            stats['invalid_labels'] += 1
                            stats['errors'].append(f"{label_file.name}:{line_num} - Coordinates out of range [0, 1]")
                            continue
                        
                        stats['valid_labels'] += 1
                        stats['class_distribution'][self.EXPECTED_CLASSES[class_id]] += 1
                        
                    except ValueError as e:
                        stats['invalid_labels'] += 1
                        stats['errors'].append(f"{label_file.name}:{line_num} - Parse error: {str(e)}")
                        
            except Exception as e:
                stats['errors'].append(f"{label_file.name} - File error: {str(e)}")
        
        logger.info(f"Label validation complete:")
        logger.info(f"  Total labels: {stats['total_labels']}")
        logger.info(f"  Valid labels: {stats['valid_labels']}")
        logger.info(f"  Invalid labels: {stats['invalid_labels']}")
        
        if stats['class_distribution']:
            logger.info("Class distribution:")
            for class_name, count in sorted(stats['class_distribution'].items()):
                logger.info(f"  {class_name}: {count}")
        
        if stats['errors'] and len(stats['errors']) <= 10:
            logger.warning("Validation errors:")
            for error in stats['errors'][:10]:
                logger.warning(f"  {error}")
        elif len(stats['errors']) > 10:
            logger.warning(f"Found {len(stats['errors'])} validation errors (showing first 10)")
            for error in stats['errors'][:10]:
                logger.warning(f"  {error}")
        
        return stats
    
    def split_dataset(self, image_files, label_files):
        """
        Split dataset into train and validation sets
        
        Args:
            image_files: List of image file paths
            label_files: List of label file paths
            
        Returns:
            tuple: (train_pairs, val_pairs)
        """
        logger.info("Splitting dataset...")
        
        # Match images with labels
        image_dict = {f.stem: f for f in image_files}
        label_dict = {f.stem: f for f in label_files}
        
        # Find matching pairs
        matched_pairs = []
        for stem in image_dict.keys():
            if stem in label_dict:
                matched_pairs.append((image_dict[stem], label_dict[stem]))
        
        logger.info(f"Matched {len(matched_pairs)} image-label pairs")
        
        # Split
        import random
        random.shuffle(matched_pairs)
        
        split_idx = int(len(matched_pairs) * self.train_split)
        train_pairs = matched_pairs[:split_idx]
        val_pairs = matched_pairs[split_idx:]
        
        logger.info(f"Train set: {len(train_pairs)} pairs")
        logger.info(f"Validation set: {len(val_pairs)} pairs")
        
        return train_pairs, val_pairs
    
    def create_output_structure(self):
        """Create output directory structure"""
        logger.info("Creating output directory structure...")
        
        dirs = [
            self.output_dir / 'train' / 'images',
            self.output_dir / 'train' / 'labels',
            self.output_dir / 'val' / 'images',
            self.output_dir / 'val' / 'labels'
        ]
        
        for dir_path in dirs:
            dir_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"  Created: {dir_path}")
    
    def copy_files(self, pairs, split_name):
        """
        Copy files to output directory
        
        Args:
            pairs: List of (image_path, label_path) tuples
            split_name: 'train' or 'val'
        """
        logger.info(f"Copying {split_name} files...")
        
        images_dest = self.output_dir / split_name / 'images'
        labels_dest = self.output_dir / split_name / 'labels'
        
        for image_path, label_path in pairs:
            # Copy image
            shutil.copy2(image_path, images_dest / image_path.name)
            
            # Copy label
            shutil.copy2(label_path, labels_dest / label_path.name)
        
        logger.info(f"  Copied {len(pairs)} pairs to {split_name}")
    
    def save_metadata(self, stats, train_count, val_count):
        """
        Save dataset metadata
        
        Args:
            stats: Validation statistics
            train_count: Number of training samples
            val_count: Number of validation samples
        """
        metadata = {
            'total_samples': train_count + val_count,
            'train_samples': train_count,
            'val_samples': val_count,
            'train_split': self.train_split,
            'classes': self.EXPECTED_CLASSES,
            'class_distribution': dict(stats['class_distribution']),
            'validation_stats': {
                'total_labels': stats['total_labels'],
                'valid_labels': stats['valid_labels'],
                'invalid_labels': stats['invalid_labels']
            }
        }
        
        metadata_path = self.output_dir / 'metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Metadata saved: {metadata_path}")
    
    def prepare(self):
        """
        Execute complete dataset preparation workflow
        """
        logger.info("=" * 60)
        logger.info("Starting Dataset Preparation")
        logger.info("=" * 60)
        
        try:
            # Validate source
            image_files, label_files = self.validate_source_structure()
            
            # Validate labels
            stats = self.validate_labels(label_files)
            
            if stats['invalid_labels'] > 0:
                logger.warning(f"Found {stats['invalid_labels']} invalid labels")
                response = input("Continue anyway? (y/n): ")
                if response.lower() != 'y':
                    logger.info("Preparation cancelled")
                    return False
            
            # Split dataset
            train_pairs, val_pairs = self.split_dataset(image_files, label_files)
            
            # Create output structure
            self.create_output_structure()
            
            # Copy files
            self.copy_files(train_pairs, 'train')
            self.copy_files(val_pairs, 'val')
            
            # Save metadata
            self.save_metadata(stats, len(train_pairs), len(val_pairs))
            
            logger.info("=" * 60)
            logger.info("Dataset Preparation Complete")
            logger.info("=" * 60)
            logger.info(f"Output directory: {self.output_dir}")
            logger.info(f"Train samples: {len(train_pairs)}")
            logger.info(f"Validation samples: {len(val_pairs)}")
            logger.info("=" * 60)
            
            return True
            
        except Exception as e:
            logger.error(f"Dataset preparation failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Prepare dataset for YOLOv8 training')
    
    parser.add_argument('--source', type=str, required=True,
                        help='Source directory containing images/ and labels/ subdirectories')
    parser.add_argument('--output', type=str, required=True,
                        help='Output directory for prepared dataset')
    parser.add_argument('--train-split', type=float, default=0.8,
                        help='Training split ratio (default: 0.8)')
    
    return parser.parse_args()


def main():
    """Main entry point"""
    args = parse_arguments()
    
    preparator = DatasetPreparator(
        source_dir=args.source,
        output_dir=args.output,
        train_split=args.train_split
    )
    
    success = preparator.prepare()
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
