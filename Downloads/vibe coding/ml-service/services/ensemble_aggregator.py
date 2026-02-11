"""
Ensemble Aggregator Service
Combines predictions from YOLO and GPT Vision using ensemble techniques
"""

import numpy as np
import logging

logger = logging.getLogger('ml-service')


class EnsembleAggregator:
    """
    Ensemble aggregator for combining YOLO and GPT Vision predictions
    """
    
    def __init__(self, yolo_weight=0.6, gpt_weight=0.4, iou_threshold=0.5, nms_threshold=0.4):
        """
        Initialize ensemble aggregator
        
        Args:
            yolo_weight: Weight for YOLO predictions (default: 0.6)
            gpt_weight: Weight for GPT predictions (default: 0.4)
            iou_threshold: IoU threshold for matching detections (default: 0.5)
            nms_threshold: NMS threshold for duplicate removal (default: 0.4)
        """
        self.yolo_weight = yolo_weight
        self.gpt_weight = gpt_weight
        self.iou_threshold = iou_threshold
        self.nms_threshold = nms_threshold
        
        logger.info(f"EnsembleAggregator initialized: "
                   f"weights=(YOLO:{yolo_weight}, GPT:{gpt_weight}), "
                   f"iou_threshold={iou_threshold}, nms_threshold={nms_threshold}")
    
    def calculate_iou(self, bbox1, bbox2):
        """
        Calculate Intersection over Union (IoU) between two bounding boxes
        
        Args:
            bbox1: First bounding box {'x': int, 'y': int, 'width': int, 'height': int}
            bbox2: Second bounding box
            
        Returns:
            float: IoU value (0.0 to 1.0)
        """
        # Extract coordinates
        x1_1, y1_1 = bbox1['x'], bbox1['y']
        x2_1, y2_1 = x1_1 + bbox1['width'], y1_1 + bbox1['height']
        
        x1_2, y1_2 = bbox2['x'], bbox2['y']
        x2_2, y2_2 = x1_2 + bbox2['width'], y1_2 + bbox2['height']
        
        # Calculate intersection area
        x_left = max(x1_1, x1_2)
        y_top = max(y1_1, y1_2)
        x_right = min(x2_1, x2_2)
        y_bottom = min(y2_1, y2_2)
        
        if x_right < x_left or y_bottom < y_top:
            return 0.0
        
        intersection_area = (x_right - x_left) * (y_bottom - y_top)
        
        # Calculate union area
        bbox1_area = bbox1['width'] * bbox1['height']
        bbox2_area = bbox2['width'] * bbox2['height']
        union_area = bbox1_area + bbox2_area - intersection_area
        
        # Calculate IoU
        iou = intersection_area / union_area if union_area > 0 else 0.0
        
        return iou
    
    def apply_nms(self, detections):
        """
        Apply Non-Maximum Suppression to remove duplicate detections
        
        Args:
            detections: List of detections
            
        Returns:
            list: Filtered detections after NMS
        """
        if not detections:
            return []
        
        # Sort by confidence (descending)
        sorted_detections = sorted(detections, key=lambda x: x['confidence'], reverse=True)
        
        # Apply NMS
        keep = []
        while sorted_detections:
            # Take detection with highest confidence
            current = sorted_detections.pop(0)
            keep.append(current)
            
            # Remove detections with high IoU
            filtered = []
            for det in sorted_detections:
                # Only compare same class
                if det['class'] == current['class']:
                    iou = self.calculate_iou(current['bbox'], det['bbox'])
                    if iou < self.nms_threshold:
                        filtered.append(det)
                else:
                    filtered.append(det)
            
            sorted_detections = filtered
        
        logger.info(f"NMS applied: {len(detections)} -> {len(keep)} detections")
        return keep
    
    def merge_detections(self, det1, det2):
        """
        Merge two matching detections by averaging confidence and bbox
        
        Args:
            det1: First detection (YOLO)
            det2: Second detection (GPT)
            
        Returns:
            dict: Merged detection
        """
        # Weighted average of confidence scores
        merged_confidence = (
            det1['confidence'] * self.yolo_weight +
            det2['confidence'] * self.gpt_weight
        )
        
        # Average bounding box coordinates
        merged_bbox = {
            'x': int((det1['bbox']['x'] + det2['bbox']['x']) / 2),
            'y': int((det1['bbox']['y'] + det2['bbox']['y']) / 2),
            'width': int((det1['bbox']['width'] + det2['bbox']['width']) / 2),
            'height': int((det1['bbox']['height'] + det2['bbox']['height']) / 2)
        }
        
        merged = {
            'class': det1['class'],
            'confidence': merged_confidence,
            'bbox': merged_bbox,
            'source': 'ensemble'
        }
        
        return merged
    
    def weighted_voting(self, det1, det2):
        """
        Resolve conflicting predictions using weighted voting
        
        Args:
            det1: First detection (YOLO)
            det2: Second detection (GPT)
            
        Returns:
            dict: Selected detection with adjusted confidence
        """
        # Calculate weighted scores
        yolo_score = det1['confidence'] * self.yolo_weight
        gpt_score = det2['confidence'] * self.gpt_weight
        
        # Select detection with higher weighted score
        if yolo_score >= gpt_score:
            selected = det1.copy()
            selected['confidence'] = yolo_score
            selected['source'] = 'yolo'
        else:
            selected = det2.copy()
            selected['confidence'] = gpt_score
            selected['source'] = 'gpt'
        
        return selected
    
    def aggregate(self, yolo_results, gpt_results):
        """
        Aggregate YOLO and GPT Vision results using ensemble techniques
        
        Args:
            yolo_results: List of YOLO detections
            gpt_results: List of GPT detections
            
        Returns:
            list: Final ensemble predictions with source attribution
        """
        try:
            logger.info(f"Aggregating results: YOLO={len(yolo_results)}, GPT={len(gpt_results)}")
            
            # Tag detections with source
            for det in yolo_results:
                det['source'] = 'yolo'
            for det in gpt_results:
                det['source'] = 'gpt'
            
            # Track matched detections
            matched_yolo = set()
            matched_gpt = set()
            ensemble_detections = []
            
            # Find matching detections between YOLO and GPT
            for i, yolo_det in enumerate(yolo_results):
                best_match = None
                best_iou = 0.0
                best_match_idx = -1
                
                for j, gpt_det in enumerate(gpt_results):
                    # Only match same class
                    if yolo_det['class'] == gpt_det['class']:
                        iou = self.calculate_iou(yolo_det['bbox'], gpt_det['bbox'])
                        if iou > best_iou:
                            best_iou = iou
                            best_match = gpt_det
                            best_match_idx = j
                
                # If IoU > threshold, both models agree
                if best_iou > self.iou_threshold:
                    logger.debug(f"Match found: {yolo_det['class']} (IoU={best_iou:.2f})")
                    merged = self.merge_detections(yolo_det, best_match)
                    ensemble_detections.append(merged)
                    matched_yolo.add(i)
                    matched_gpt.add(best_match_idx)
            
            # Add unmatched YOLO detections (if confidence > threshold)
            for i, yolo_det in enumerate(yolo_results):
                if i not in matched_yolo:
                    # Use YOLO detection if confidence is high enough
                    if yolo_det['confidence'] > 0.7:
                        logger.debug(f"Adding unmatched YOLO detection: {yolo_det['class']} "
                                   f"(conf={yolo_det['confidence']:.2f})")
                        ensemble_detections.append(yolo_det)
            
            # Add unmatched GPT detections (if confidence > threshold)
            for j, gpt_det in enumerate(gpt_results):
                if j not in matched_gpt:
                    # Use GPT detection if confidence is high enough
                    if gpt_det['confidence'] > 0.7:
                        logger.debug(f"Adding unmatched GPT detection: {gpt_det['class']} "
                                   f"(conf={gpt_det['confidence']:.2f})")
                        ensemble_detections.append(gpt_det)
            
            # Apply NMS to remove duplicates
            final_detections = self.apply_nms(ensemble_detections)
            
            # Log summary
            logger.info(f"Ensemble aggregation complete: {len(final_detections)} final detection(s)")
            
            # Log detection breakdown by source
            source_counts = {'yolo': 0, 'gpt': 0, 'ensemble': 0}
            for det in final_detections:
                source_counts[det['source']] = source_counts.get(det['source'], 0) + 1
            
            logger.info(f"Detection sources: {source_counts}")
            
            return final_detections
            
        except Exception as e:
            error_msg = f"Ensemble aggregation failed: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
