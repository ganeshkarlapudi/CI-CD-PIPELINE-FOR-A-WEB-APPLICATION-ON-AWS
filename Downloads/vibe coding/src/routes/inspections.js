const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  validateObjectId,
  paginationValidation,
  dateRangeValidation,
  defectClassValidation,
  statusValidation,
  reportFormatValidation,
} = require('../middleware/validation');
const { validateUploadedFiles } = require('../middleware/fileValidation');
const upload = require('../config/multer');
const { uploadFile } = require('../config/storage');
const { processUploadedImage, calculateImageQuality } = require('../services/imageService');
const Inspection = require('../models/Inspection');
const { 
  cacheInspectionResult, 
  getCachedInspectionResult, 
  invalidateInspectionCache 
} = require('../config/redis');
const logger = require('../config/logger');

/**
 * @route   POST /api/inspections/upload
 * @desc    Upload aircraft inspection images
 * @access  Private
 */
router.post('/upload', authenticate, upload.array('images', 10), validateUploadedFiles, async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files were uploaded',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const inspectionIds = [];
    const errors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Process and validate image
        const processedImage = await processUploadedImage(file);
        
        // Calculate image quality
        const qualityScore = await calculateImageQuality(file.buffer);
        
        // Check if quality is sufficient
        if (qualityScore < 60) {
          logger.warn(`Low quality image uploaded: ${processedImage.originalName} (score: ${qualityScore})`);
        }
        
        // Upload file to storage
        const imageUrl = await uploadFile(
          processedImage.buffer,
          processedImage.filename,
          processedImage.mimetype
        );
        
        // Create inspection record in database
        const inspection = new Inspection({
          userId: req.user.id,
          imageUrl: imageUrl,
          imageMetadata: {
            filename: processedImage.filename,
            size: processedImage.size,
            format: processedImage.dimensions.format,
            dimensions: {
              width: processedImage.dimensions.width,
              height: processedImage.dimensions.height,
            },
            uploadedAt: new Date(),
          },
          status: 'uploaded',
        });
        
        await inspection.save();
        
        inspectionIds.push({
          inspectionId: inspection._id,
          filename: processedImage.originalName,
          qualityScore: qualityScore,
        });
        
        logger.info(`Inspection created: ${inspection._id} for user: ${req.user.id}`);
      } catch (error) {
        logger.error(`Error processing file ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    // Return response
    if (inspectionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'All file uploads failed',
          details: errors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      data: {
        inspections: inspectionIds,
        totalUploaded: inspectionIds.length,
        totalFailed: errors.length,
        ...(errors.length > 0 && { errors }),
      },
      message: `Successfully uploaded ${inspectionIds.length} image(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Upload endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message || 'Failed to upload images',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/inspections
 * @desc    Get inspection history with filtering and pagination
 * @access  Private
 */
router.get('/', authenticate, paginationValidation, dateRangeValidation, defectClassValidation, statusValidation, async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      defectClass,
      status,
    } = req.query;

    // Build query filter
    const filter = {};

    // Filter by user (non-admin users can only see their own inspections)
    if (req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day for endDate
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
      }
    }

    // Filter by defect class
    if (defectClass) {
      filter['defects.class'] = defectClass;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Execute query with pagination and sorting
    const [inspections, total] = await Promise.all([
      Inspection.find(filter)
        .sort({ createdAt: -1 }) // Sort by createdAt descending
        .skip(skip)
        .limit(limitNum)
        .select('-__v') // Exclude version field
        .lean(), // Convert to plain JavaScript objects for better performance
      Inspection.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Return paginated results
    res.status(200).json({
      success: true,
      data: {
        inspections,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Get inspections history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve inspection history',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/inspections/:id
 * @desc    Get inspection by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inspection not found',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check if user owns this inspection or is admin
    if (inspection.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this inspection',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    res.status(200).json({
      success: true,
      data: inspection,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get inspection error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve inspection',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   POST /api/inspections/:id/analyze
 * @desc    Trigger ML analysis for an uploaded inspection
 * @access  Private
 */
router.post('/:id/analyze', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    
    // Validate inspection exists
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inspection not found',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check if user owns this inspection or is admin
    if (inspection.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to analyze this inspection',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate inspection status is "uploaded"
    if (inspection.status !== 'uploaded') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot analyze inspection with status "${inspection.status}". Only inspections with status "uploaded" can be analyzed.`,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Update inspection status to "processing"
    inspection.status = 'processing';
    await inspection.save();
    
    // Invalidate cached inspection result since we're re-analyzing
    await invalidateInspectionCache(inspection._id.toString());
    
    logger.info(`Inspection ${inspection._id} status updated to processing`);
    
    // Make async HTTP request to ML service
    const axios = require('axios');
    const ApiLog = require('../models/ApiLog');
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    
    // Fire and forget - don't wait for ML service response
    const mlStartTime = Date.now();
    
    axios.post(`${mlServiceUrl}/ml/detect`, {
      imageUrl: inspection.imageUrl,
      inspectionId: inspection._id.toString(),
    }, {
      timeout: 60000, // 60 second timeout
    }).then(async (mlResponse) => {
      // Handle successful ML response
      const mlResponseTime = Date.now() - mlStartTime;
      logger.info(`ML analysis completed for inspection ${inspection._id} in ${mlResponseTime}ms`);
      
      // Update inspection with results directly
      try {
        const completedInspection = await Inspection.findById(inspection._id);
        if (completedInspection && mlResponse.data && mlResponse.data.success) {
          const { defects, processingTime, qualityScore, metadata } = mlResponse.data.data;
          
          completedInspection.status = 'completed';
          completedInspection.defects = defects || [];
          completedInspection.processingTime = processingTime || mlResponseTime;
          completedInspection.modelVersion = metadata?.modelVersion || 'v1.0.0';
          
          await completedInspection.save();
          
          logger.info(`Inspection ${inspection._id} updated with ${defects?.length || 0} defect(s)`);
          
          // Log successful API call
          await ApiLog.create({
            service: 'ensemble',
            endpoint: '/ml/detect',
            userId: completedInspection.userId,
            inspectionId: completedInspection._id,
            requestData: {
              imageUrl: completedInspection.imageUrl,
              inspectionId: inspection._id.toString(),
            },
            responseTime: processingTime || mlResponseTime,
            status: 'success',
            tokenUsage: metadata?.tokenUsage || null,
            cost: metadata?.cost || null,
            timestamp: new Date(),
          });
        }
      } catch (updateError) {
        logger.error(`Failed to update inspection with results:`, updateError);
      }
    }).catch(async (error) => {
      // Handle ML service error
      const mlResponseTime = Date.now() - mlStartTime;
      logger.error(`ML analysis failed for inspection ${inspection._id}:`, error.message);
      
      // Update inspection status to failed
      try {
        const failedInspection = await Inspection.findById(inspection._id);
        if (failedInspection) {
          failedInspection.status = 'failed';
          failedInspection.errorMessage = error.message || 'ML service request failed';
          await failedInspection.save();
          
          // Log failed API call
          await ApiLog.create({
            service: 'ensemble',
            endpoint: '/ml/detect',
            userId: failedInspection.userId,
            inspectionId: failedInspection._id,
            requestData: {
              imageUrl: failedInspection.imageUrl,
              inspectionId: inspection._id.toString(),
            },
            responseTime: mlResponseTime,
            status: 'error',
            errorMessage: error.message || 'ML service request failed',
            timestamp: new Date(),
          });
        }
      } catch (updateError) {
        logger.error(`Failed to update inspection status to failed:`, updateError);
      }
    });
    
    // Return immediately with processing status
    res.status(202).json({
      success: true,
      data: {
        inspectionId: inspection._id,
        status: 'processing',
        message: 'Analysis started. Check back for results.',
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Analyze inspection error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to start analysis',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/inspections/:id/results
 * @desc    Get inspection results with defects and analysis data
 * @access  Private
 */
router.get('/:id/results', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    // Try to get cached result first
    const cachedResult = await getCachedInspectionResult(req.params.id);
    
    if (cachedResult) {
      // Check if user owns this inspection or is admin
      if (cachedResult.userId.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this inspection',
          },
          timestamp: new Date().toISOString(),
        });
      }

      logger.debug(`Returning cached inspection result: ${req.params.id}`);
      return res.status(200).json({
        success: true,
        data: cachedResult,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Cache miss - fetch from database
    const inspection = await Inspection.findById(req.params.id);
    
    // Validate inspection exists
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inspection not found',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check if user owns this inspection or is admin
    if (inspection.userId.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this inspection',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Handle different status cases
    if (inspection.status === 'processing') {
      return res.status(200).json({
        success: true,
        data: {
          inspectionId: inspection._id,
          status: 'processing',
          imageUrl: inspection.imageUrl,
          message: 'Analysis is still in progress. Please check back shortly.',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    if (inspection.status === 'failed') {
      return res.status(200).json({
        success: true,
        data: {
          inspectionId: inspection._id,
          status: 'failed',
          imageUrl: inspection.imageUrl,
          errorMessage: inspection.errorMessage || 'Analysis failed',
          message: 'Analysis failed. Please try again or contact support.',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    if (inspection.status === 'uploaded') {
      return res.status(200).json({
        success: true,
        data: {
          inspectionId: inspection._id,
          status: 'uploaded',
          imageUrl: inspection.imageUrl,
          message: 'Inspection has not been analyzed yet. Please trigger analysis first.',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Status is "completed" - return full results and cache them
    const resultData = {
      inspectionId: inspection._id,
      userId: inspection.userId,
      status: inspection.status,
      imageUrl: inspection.imageUrl,
      defects: inspection.defects,
      processingTime: inspection.processingTime,
      modelVersion: inspection.modelVersion,
      imageMetadata: inspection.imageMetadata,
      defectCount: inspection.defects.length,
      createdAt: inspection.createdAt,
      updatedAt: inspection.updatedAt,
    };

    // Cache the completed inspection result (1-hour TTL)
    await cacheInspectionResult(req.params.id, resultData);

    res.status(200).json({
      success: true,
      data: resultData,
      cached: false,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Get inspection results error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve inspection results',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/inspections/:id/report
 * @desc    Generate and export inspection report in JSON or PDF format
 * @access  Private
 */
router.get('/:id/report', authenticate, validateObjectId('id'), reportFormatValidation, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const inspection = await Inspection.findById(req.params.id);
    
    // Validate inspection exists
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inspection not found',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check if user owns this inspection or is admin
    if (inspection.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this inspection',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check if inspection has been analyzed
    if (inspection.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot generate report for inspection with status "${inspection.status}". Only completed inspections can be exported.`,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Handle JSON format
    if (format === 'json') {
      // Group defects by class for summary statistics
      const defectsByClass = {};
      inspection.defects.forEach(defect => {
        if (!defectsByClass[defect.class]) {
          defectsByClass[defect.class] = {
            count: 0,
            avgConfidence: 0,
            defects: [],
          };
        }
        defectsByClass[defect.class].count++;
        defectsByClass[defect.class].defects.push(defect);
      });
      
      // Calculate average confidence for each class
      Object.keys(defectsByClass).forEach(className => {
        const classData = defectsByClass[className];
        const totalConfidence = classData.defects.reduce((sum, d) => sum + d.confidence, 0);
        classData.avgConfidence = totalConfidence / classData.count;
      });
      
      // Build JSON report
      const jsonReport = {
        metadata: {
          reportId: inspection._id,
          generatedAt: new Date().toISOString(),
          inspectionDate: inspection.createdAt,
          aircraftId: inspection.aircraftId || 'N/A',
          modelVersion: inspection.modelVersion || 'v1.0.0',
          processingTime: inspection.processingTime,
        },
        image: {
          url: inspection.imageUrl,
          filename: inspection.imageMetadata?.filename,
          dimensions: inspection.imageMetadata?.dimensions,
          format: inspection.imageMetadata?.format,
          uploadedAt: inspection.imageMetadata?.uploadedAt,
        },
        summary: {
          totalDefects: inspection.defects.length,
          defectsByClass: Object.keys(defectsByClass).map(className => ({
            class: className,
            count: defectsByClass[className].count,
            avgConfidence: Math.round(defectsByClass[className].avgConfidence * 100) / 100,
          })),
        },
        defects: inspection.defects.map(defect => ({
          class: defect.class,
          confidence: Math.round(defect.confidence * 100) / 100,
          boundingBox: defect.bbox,
          source: defect.source,
        })),
      };
      
      // Set appropriate headers for JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="inspection-report-${inspection._id}.json"`);
      
      return res.status(200).json(jsonReport);
    }
    
    // Handle PDF format
    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const axios = require('axios');
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="inspection-report-${inspection._id}.pdf"`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add title
      doc.fontSize(20).text('Aircraft Inspection Report', { align: 'center' });
      doc.moveDown();
      
      // Add metadata section
      doc.fontSize(14).text('Inspection Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Report ID: ${inspection._id}`);
      doc.text(`Inspection Date: ${new Date(inspection.createdAt).toLocaleString()}`);
      doc.text(`Aircraft ID: ${inspection.aircraftId || 'N/A'}`);
      doc.text(`Model Version: ${inspection.modelVersion || 'v1.0.0'}`);
      doc.text(`Processing Time: ${inspection.processingTime ? `${inspection.processingTime}ms` : 'N/A'}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();
      
      // Add image metadata
      doc.fontSize(14).text('Image Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Filename: ${inspection.imageMetadata?.filename || 'N/A'}`);
      doc.text(`Format: ${inspection.imageMetadata?.format || 'N/A'}`);
      if (inspection.imageMetadata?.dimensions) {
        doc.text(`Dimensions: ${inspection.imageMetadata.dimensions.width}x${inspection.imageMetadata.dimensions.height}`);
      }
      doc.moveDown();
      
      // Add summary statistics
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Total Defects Detected: ${inspection.defects.length}`);
      doc.moveDown();
      
      // Group defects by class
      const defectsByClass = {};
      inspection.defects.forEach(defect => {
        if (!defectsByClass[defect.class]) {
          defectsByClass[defect.class] = [];
        }
        defectsByClass[defect.class].push(defect);
      });
      
      // Add defects by type section
      doc.fontSize(14).text('Defects by Type', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      
      Object.keys(defectsByClass).sort().forEach(className => {
        const classDefects = defectsByClass[className];
        const avgConfidence = classDefects.reduce((sum, d) => sum + d.confidence, 0) / classDefects.length;
        
        doc.text(`${className}: ${classDefects.length} defect(s) (Avg Confidence: ${Math.round(avgConfidence * 100)}%)`);
      });
      doc.moveDown();
      
      // Add detailed defects table
      doc.addPage();
      doc.fontSize(14).text('Detailed Defect List', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);
      
      // Table headers
      const tableTop = doc.y;
      const colWidths = { no: 30, class: 120, confidence: 80, bbox: 150, source: 80 };
      let currentY = tableTop;
      
      doc.text('#', 50, currentY, { width: colWidths.no, continued: true });
      doc.text('Defect Class', 80, currentY, { width: colWidths.class, continued: true });
      doc.text('Confidence', 200, currentY, { width: colWidths.confidence, continued: true });
      doc.text('Bounding Box', 280, currentY, { width: colWidths.bbox, continued: true });
      doc.text('Source', 430, currentY, { width: colWidths.source });
      
      currentY += 15;
      doc.moveTo(50, currentY).lineTo(510, currentY).stroke();
      currentY += 5;
      
      // Table rows
      inspection.defects.forEach((defect, index) => {
        // Check if we need a new page
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
        
        const bboxText = defect.bbox 
          ? `x:${Math.round(defect.bbox.x)}, y:${Math.round(defect.bbox.y)}, w:${Math.round(defect.bbox.width)}, h:${Math.round(defect.bbox.height)}`
          : 'N/A';
        
        doc.text(`${index + 1}`, 50, currentY, { width: colWidths.no, continued: true });
        doc.text(defect.class, 80, currentY, { width: colWidths.class, continued: true });
        doc.text(`${Math.round(defect.confidence * 100)}%`, 200, currentY, { width: colWidths.confidence, continued: true });
        doc.text(bboxText, 280, currentY, { width: colWidths.bbox, continued: true });
        doc.text(defect.source || 'N/A', 430, currentY, { width: colWidths.source });
        
        currentY += 20;
      });
      
      // Add footer
      doc.fontSize(8).text(
        `Report generated by Aircraft Defect Detection System - ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
      
      // Finalize PDF
      doc.end();
      
      logger.info(`PDF report generated for inspection ${inspection._id}`);
      return;
    }
    
    // Invalid format
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'Invalid format parameter. Supported formats: json, pdf',
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate report',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   POST /api/inspections/:id/callback
 * @desc    Callback endpoint for ML service to send analysis results
 * @access  Public (should be secured with API key in production)
 */
router.post('/:id/callback', async (req, res) => {
  const ApiLog = require('../models/ApiLog');
  const startTime = Date.now();
  
  try {
    const inspectionId = req.params.id;
    const { success, data, error } = req.body;
    
    logger.info(`Received callback for inspection ${inspectionId}`);
    
    // Validate inspection exists
    const inspection = await Inspection.findById(inspectionId);
    
    if (!inspection) {
      logger.error(`Callback received for non-existent inspection: ${inspectionId}`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inspection not found',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    // Handle successful ML analysis
    if (success && data) {
      const { defects, processingTime, qualityScore, metadata } = data;
      
      // Update inspection with results
      inspection.status = 'completed';
      inspection.defects = defects || [];
      inspection.processingTime = processingTime || null;
      inspection.modelVersion = metadata?.modelVersion || 'v1.0.0';
      
      await inspection.save();
      
      // Cache the completed inspection result
      await cacheInspectionResult(inspectionId, {
        inspectionId: inspection._id,
        userId: inspection.userId,
        status: inspection.status,
        imageUrl: inspection.imageUrl,
        defects: inspection.defects,
        processingTime: inspection.processingTime,
        modelVersion: inspection.modelVersion,
        imageMetadata: inspection.imageMetadata,
        defectCount: inspection.defects.length,
        createdAt: inspection.createdAt,
        updatedAt: inspection.updatedAt,
      });
      
      logger.info(`Inspection ${inspectionId} updated with ${defects?.length || 0} defect(s)`);
      
      // Log API call to apiLogs collection
      await ApiLog.create({
        service: 'ensemble',
        endpoint: '/ml/detect',
        userId: inspection.userId,
        inspectionId: inspection._id,
        requestData: {
          imageUrl: inspection.imageUrl,
          inspectionId: inspectionId,
        },
        responseTime: processingTime || responseTime,
        status: 'success',
        tokenUsage: metadata?.tokenUsage || null,
        cost: metadata?.cost || null,
        timestamp: new Date(),
      });
      
      return res.status(200).json({
        success: true,
        message: 'Results stored successfully',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Handle failed ML analysis
    if (!success || error) {
      inspection.status = 'failed';
      inspection.errorMessage = error?.message || 'ML analysis failed';
      
      await inspection.save();
      
      logger.error(`Inspection ${inspectionId} failed: ${inspection.errorMessage}`);
      
      // Log failed API call
      await ApiLog.create({
        service: 'ensemble',
        endpoint: '/ml/detect',
        userId: inspection.userId,
        inspectionId: inspection._id,
        requestData: {
          imageUrl: inspection.imageUrl,
          inspectionId: inspectionId,
        },
        responseTime: responseTime,
        status: 'error',
        errorMessage: inspection.errorMessage,
        timestamp: new Date(),
      });
      
      return res.status(200).json({
        success: true,
        message: 'Failure status stored successfully',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Invalid callback data
    logger.error(`Invalid callback data received for inspection ${inspectionId}`);
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'Invalid callback data',
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Callback endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to process callback',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/inspections/trends/defects
 * @desc    Get defect frequency trends by type over time
 * @access  Private
 */
router.get('/trends/defects', authenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day', // day, week, month
    } = req.query;

    // Build query filter
    const filter = {};

    // Filter by user (non-admin users can only see their own inspections)
    if (req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
      }
    }

    // Only include completed inspections
    filter.status = 'completed';

    // Aggregation pipeline to get defect frequency by type over time
    const pipeline = [
      { $match: filter },
      { $unwind: '$defects' },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            defectClass: '$defects.class'
          },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$defects.confidence' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          defects: {
            $push: {
              class: '$_id.defectClass',
              count: '$count',
              avgConfidence: '$avgConfidence'
            }
          },
          totalDefects: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const trends = await Inspection.aggregate(pipeline);

    // Format response
    const formattedTrends = trends.map(trend => ({
      date: trend._id,
      totalDefects: trend.totalDefects,
      defectsByClass: trend.defects.map(d => ({
        class: d.class,
        count: d.count,
        avgConfidence: Math.round(d.avgConfidence * 100) / 100
      }))
    }));

    res.status(200).json({
      success: true,
      data: {
        trends: formattedTrends,
        groupBy: groupBy
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Get defect trends error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve defect trends',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/inspections/trends/summary
 * @desc    Get summary statistics for trend analysis
 * @access  Private
 */
router.get('/trends/summary', authenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
    } = req.query;

    // Build query filter
    const filter = {};

    // Filter by user (non-admin users can only see their own inspections)
    if (req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
      }
    }

    // Only include completed inspections
    filter.status = 'completed';

    // Aggregation pipeline for summary statistics
    const pipeline = [
      { $match: filter },
      {
        $facet: {
          // Total defects by class
          defectsByClass: [
            { $unwind: '$defects' },
            {
              $group: {
                _id: '$defects.class',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$defects.confidence' }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Inspection frequency over time
          inspectionFrequency: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          // Overall statistics
          overallStats: [
            {
              $group: {
                _id: null,
                totalInspections: { $sum: 1 },
                avgProcessingTime: { $avg: '$processingTime' },
                totalDefects: { $sum: { $size: '$defects' } }
              }
            }
          ]
        }
      }
    ];

    const [result] = await Inspection.aggregate(pipeline);

    // Format response
    const summary = {
      defectsByClass: result.defectsByClass.map(d => ({
        class: d._id,
        count: d.count,
        avgConfidence: Math.round(d.avgConfidence * 100) / 100
      })),
      inspectionFrequency: result.inspectionFrequency.map(f => ({
        date: f._id,
        count: f.count
      })),
      overallStats: result.overallStats[0] || {
        totalInspections: 0,
        avgProcessingTime: 0,
        totalDefects: 0
      }
    };

    res.status(200).json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Get trend summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve trend summary',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
