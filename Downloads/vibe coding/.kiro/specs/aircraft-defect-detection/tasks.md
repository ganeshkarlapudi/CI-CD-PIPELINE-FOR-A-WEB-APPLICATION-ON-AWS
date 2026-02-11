# Implementation Plan

- [x] 1. Set up project structure and initialize backend
  - Create directory structure for backend (src/models, src/routes, src/middleware, src/services, src/config)
  - Initialize Node.js project with package.json
  - Install core dependencies (express, mongoose, bcrypt, jsonwebtoken, multer, cors, dotenv)
  - Create environment configuration file (.env.example)
  - Set up Express server with basic middleware (cors, body-parser, morgan)
  - _Requirements: 1.1, 2.1, 11.6_

- [x] 2. Implement MongoDB database models and connection
  - Create MongoDB connection utility with error handling
  - Implement User schema with Mongoose (username, email, password, role, status, timestamps)
  - Implement Inspection schema with embedded defects array
  - Implement Model schema for ML model versioning
  - Implement ApiLog and SystemLog schemas
  - Add indexes to schemas (username, email, userId, createdAt, status)
  - _Requirements: 1.6, 2.2, 11.6, 13.6_

- [x] 3. Build authentication system

- [x] 3.1 Implement user registration endpoint
  - Create POST /api/auth/register route
  - Implement validation middleware for registration fields (username, email, password format)
  - Add password complexity validation (min 8 chars, uppercase, lowercase, digit, special char)
  - Hash password using bcrypt before storing
  - Create user in MongoDB with default "user" role
  - Return success response with userId
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 3.2 Implement user login endpoint
  - Create POST /api/auth/login route
  - Validate credentials against MongoDB User collection
  - Implement bcrypt password comparison
  - Generate JWT token with 24-hour expiration
  - Track failed login attempts and implement account lockout (5 attempts)
  - Return token and user data (id, username, email, role)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8_

- [x] 3.3 Implement authentication middleware
  - Create JWT verification middleware
  - Extract and validate Bearer token from Authorization header
  - Decode token and attach user data to request object
  - Handle expired token errors
  - Implement role-based authorization middleware (user vs admin)
  - _Requirements: 2.5, 11.2, 11.3_

- [x] 3.4 Implement logout endpoint
  - Create POST /api/auth/logout route
  - Invalidate session token (add to Redis blacklist)
  - Return success message
  - _Requirements: 3.1, 3.2_

- [x] 4. Create frontend authentication pages

- [x] 4.1 Build registration page (register.html)
  - Create HTML form with fields (username, email, password, confirmPassword)
  - Add Bootstrap 5 styling for responsive layout
  - Implement client-side validation with JavaScript
  - Add password strength indicator
  - Display real-time validation feedback
  - Make POST request to /api/auth/register using Axios
  - Handle success (redirect to login) and error responses
  - _Requirements: 1.1, 1.4, 1.5, 1.8_

- [x] 4.2 Build login page (login.html)
  - Create HTML form with username and password fields
  - Add Bootstrap 5 styling
  - Implement form validation
  - Make POST request to /api/auth/login using Axios
  - Store JWT token in localStorage
  - Redirect to user-dashboard.html or admin-dashboard.html based on role
  - Display error messages for invalid credentials
  - _Requirements: 2.1, 2.4, 2.6, 2.7_

- [x] 5. Build user interface pages

- [x] 5.1 Create user dashboard (user-dashboard.html)
  - Build navigation sidebar with links (Upload, Results, History, Profile, Logout)
  - Create statistics cards displaying total inspections and defects found
  - Add recent inspections list with clickable items
  - Implement quick upload button
  - Add responsive layout with Bootstrap 5
  - Fetch user statistics from backend API
  - _Requirements: 9.1, 9.3, 9.4, 9.5_

- [x] 5.2 Create upload page (upload.html)
  - Build drag-and-drop file upload zone
  - Add multi-file selection support
  - Implement file preview thumbnails
  - Add upload progress bars for each file
  - Validate file types (JPEG, PNG, TIFF) and size (max 50MB)
  - Make POST request to /api/inspections/upload with FormData
  - Display success/error messages
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 5.3 Create results page (results.html)
  - Display uploaded image with canvas overlay for bounding boxes
  - Draw bounding boxes with distinct colors per defect class
  - Add labels with defect type and confidence percentage
  - Create defect list panel with filter controls
  - Implement hover tooltips showing detailed defect information
  - Add export buttons for PDF and JSON reports
  - Implement confidence threshold slider
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5.4 Create history page (history.html)
  - Build inspection records table with pagination
  - Add search and filter controls (date range picker, defect class dropdown)
  - Implement sorting by date
  - Create trend visualization charts using Chart.js
  - Add comparison view for selecting multiple inspections
  - Fetch inspection data from /api/inspections endpoint
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. Build admin interface pages

- [x] 6.1 Create admin dashboard (admin-dashboard.html)
  - Build navigation sidebar (Users, Models, Monitoring, Settings, Logout)
  - Create system metrics overview cards
  - Display active users count
  - Show model performance statistics
  - Add responsive layout with Bootstrap 5
  - Fetch metrics from /api/admin/monitoring/metrics
  - _Requirements: 10.1, 14.2_

- [x] 6.2 Create user management page (admin-users.html)
  - Build user management table with columns (username, email, role, status, actions)
  - Add pagination controls
  - Create modal for creating/editing users
  - Implement activate/deactivate user buttons
  - Add role assignment dropdown (user, admin)
  - Make API calls to /api/admin/users endpoints
  - _Requirements: 10.7, 11.1, 11.2, 11.5_

- [x] 6.3 Create model management page (admin-models.html)
  - Build model version history table
  - Add upload training dataset interface with file selection
  - Create retrain model button with progress tracking
  - Display model performance comparison charts (mAP, inference time)
  - Show training job status and metrics
  - Make API calls to /api/admin/models endpoints
  - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 6.4 Create monitoring page (admin-monitoring.html)
  - Build real-time metrics dashboard
  - Display API usage statistics (GPT Vision calls, costs)
  - Create error logs table with severity filters
  - Add performance graphs using Chart.js (processing time, throughput)
  - Implement auto-refresh for real-time updates
  - Fetch data from /api/admin/monitoring endpoints
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 7. Implement image upload and storage backend
  - Configure Multer middleware for file uploads
  - Implement file validation (type, size, dimensions)
  - Create POST /api/inspections/upload endpoint
  - Set up AWS S3 client or local storage service
  - Upload images to S3 with unique identifiers
  - Create inspection records in MongoDB with "uploaded" status
  - Return inspection IDs to client
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Set up Python ML inference service

- [x] 8.1 Initialize Python Flask application
  - Create Flask app structure (app.py, services/, utils/)
  - Install dependencies (flask, ultralytics, opencv-python, numpy, openai, pillow, requests)
  - Set up environment configuration for API keys and model paths
  - Create health check endpoint (/health)
  - _Requirements: 5.1, 12.5_

- [x] 8.2 Implement image preprocessing service
  - Create ImagePreprocessor class
  - Implement image loading from S3 URL
  - Add image resizing to YOLOv8 input size (640x640)
  - Implement brightness and contrast normalization
  - Add adaptive filtering for glare and shadows
  - Validate image dimensions (640x640 to 4096x4096)
  - Calculate and return image quality score
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 8.3 Implement YOLOv8 detection service
  - Create YOLODetector class
  - Load pre-trained YOLOv8 model weights
  - Implement detect() method for inference
  - Configure confidence threshold (0.5)
  - Post-process results to extract bounding boxes and classes
  - Return detections in standard format [{ class, confidence, bbox }]
  - _Requirements: 5.1, 12.5_

- [x] 8.4 Implement GPT Vision API client
  - Create GPTVisionClient class
  - Implement analyze_image() method to call OpenAI GPT-4 Vision API
  - Format prompt to identify aircraft defects with bounding boxes
  - Parse API response to extract defect classifications
  - Handle API errors and timeouts with retry logic
  - Return detections in standard format
  - _Requirements: 5.2_

- [x] 8.5 Implement ensemble aggregator
  - Create EnsembleAggregator class
  - Implement aggregate() method to combine YOLO and GPT results
  - Apply Non-Maximum Suppression (NMS) to remove duplicate detections
  - Implement weighted voting for conflicting predictions (YOLO: 0.6, GPT: 0.4)
  - Calculate IoU (Intersection over Union) for matching detections
  - Average confidence scores when both models agree (IoU > 0.5)
  - Return final ensemble predictions with source attribution
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 8.6 Create ML gateway endpoint
  - Create POST /ml/detect endpoint in Flask
  - Accept { imageUrl, inspectionId } as input
  - Orchestrate preprocessing → YOLO inference → GPT Vision → ensemble aggregation
  - Execute YOLO and GPT Vision in parallel using threading
  - Track processing time
  - Return { defects: [], processingTime } to backend API
  - Implement error handling and logging
  - _Requirements: 5.1, 5.2, 5.3, 12.1, 12.4_

- [x] 9. Implement inspection analysis backend endpoints

- [x] 9.1 Create inspection analysis trigger endpoint
  - Create POST /api/inspections/:id/analyze endpoint
  - Validate inspection exists and status is "uploaded"
  - Update inspection status to "processing"
  - Make HTTP request to ML service /ml/detect endpoint
  - Handle async processing (return immediately with status)
  - _Requirements: 5.1, 12.3_

- [x] 9.2 Create inspection results endpoint
  - Create GET /api/inspections/:id/results endpoint
  - Fetch inspection from MongoDB by ID
  - Return inspection data with defects, imageUrl, status, processingTime
  - Handle "processing" status with appropriate message
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.3 Implement inspection results storage
  - Create callback endpoint or webhook for ML service to send results
  - Update inspection record in MongoDB with defects array
  - Set status to "completed" or "failed"
  - Store processing time and model version
  - Log API call details to apiLogs collection
  - _Requirements: 5.4, 13.7, 14.1_

- [x] 10. Implement inspection history and filtering
  - Create GET /api/inspections endpoint with query parameters
  - Implement pagination (page, limit)
  - Add filtering by date range (startDate, endDate)
  - Add filtering by defect class
  - Sort results by createdAt descending
  - Return paginated results with total count
  - _Requirements: 13.1, 13.2, 13.6_

- [x] 11. Implement report generation

- [x] 11.1 Create JSON report export
  - Create GET /api/inspections/:id/report?format=json endpoint
  - Fetch inspection data with all defects
  - Format as JSON with metadata (date, aircraft ID, model version)
  - Return JSON response
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 11.2 Create PDF report export
  - Install PDF generation library (pdfkit or puppeteer)
  - Create GET /api/inspections/:id/report?format=pdf endpoint
  - Generate PDF with image, bounding boxes, and defect table
  - Organize defects by type with summary statistics
  - Include metadata section
  - Return PDF file download
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Implement admin user management endpoints
  - Create GET /api/admin/users endpoint with pagination and search
  - Create POST /api/admin/users endpoint for creating users
  - Create PUT /api/admin/users/:id endpoint for updating user role/status
  - Create DELETE /api/admin/users/:id endpoint for deactivating users
  - Add admin authorization middleware to all endpoints
  - Validate role assignments and status changes
  - _Requirements: 10.7, 11.1, 11.2, 11.3, 11.5_

- [x] 13. Implement admin model management endpoints

- [x] 13.1 Create model listing endpoint
  - Create GET /api/admin/models endpoint
  - Fetch all models from MongoDB sorted by createdAt
  - Return model versions with mAP, status, and deployment info
  - _Requirements: 10.6_

- [x] 13.2 Create training dataset upload endpoint
  - Create POST /api/admin/models/train endpoint
  - Accept FormData with training images and label files
  - Validate images are properly labeled with defect classes
  - Store training data in S3
  - Create training job record in MongoDB
  - Return jobId
  - _Requirements: 10.2, 10.3_

- [x] 13.3 Implement model training job status endpoint
  - Create GET /api/admin/models/train/:jobId endpoint
  - Return job status (training, validating, completed, failed)
  - Return progress percentage and current metrics (loss, mAP)
  - _Requirements: 10.4_

- [x] 13.4 Implement model deployment endpoint
  - Create POST /api/admin/models/:version/deploy endpoint
  - Validate model mAP is at least 95%
  - Update model status to "deployed"
  - Archive previous deployed model
  - Update ML service to use new model weights
  - _Requirements: 10.5, 10.6_

- [x] 14. Implement admin monitoring endpoints
  - Create GET /api/admin/monitoring/metrics endpoint
  - Aggregate data from inspections, apiLogs, and systemLogs collections
  - Calculate total inspections, average processing time, API costs
  - Count active users and error occurrences
  - Return metrics with date range filtering
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 15. Implement admin logging endpoints
  - Create GET /api/admin/monitoring/logs endpoint
  - Fetch logs from systemLogs collection with pagination
  - Add filtering by severity level (info, warning, error, critical)
  - Add filtering by date range
  - Sort by timestamp descending
  - Return paginated log entries
  - _Requirements: 14.5_

- [x] 16. Implement Redis caching layer
  - Set up Redis client connection
  - Implement session token storage in Redis (24-hour TTL)
  - Cache model weights references
  - Cache frequently accessed inspection results (1-hour TTL)
  - Implement token blacklist for logout functionality
  - _Requirements: 3.2, 12.5_

- [x] 17. Add frontend authentication flow
  - Create auth utility module (auth.js) for token management
  - Implement token storage in localStorage
  - Add authentication check on page load
  - Redirect to login if token is missing or invalid
  - Add logout functionality to all pages
  - Implement automatic token refresh before expiration
  - _Requirements: 2.5, 2.6, 2.7, 3.1, 3.2, 3.3_

- [x] 18. Implement frontend API client
  - Create API client module (api.js) using Axios
  - Add request interceptor to attach JWT token to headers
  - Add response interceptor for error handling
  - Implement retry logic for failed requests
  - Create wrapper functions for all API endpoints
  - _Requirements: 2.5, 9.2_

- [x] 19. Add real-time processing status updates
  - Implement polling mechanism in results.html to check inspection status
  - Display processing spinner while status is "processing"
  - Auto-refresh results when status changes to "completed"
  - Show error message if status is "failed"
  - _Requirements: 12.3_

- [x] 20. Implement defect visualization on results page
  - Create canvas overlay on image element
  - Define color mapping for each defect class (12 classes)
  - Draw bounding boxes with class-specific colors
  - Add text labels with defect type and confidence percentage
  - Implement hover event to show detailed tooltip
  - Update visualization when filters are applied
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2_

- [x] 21. Implement trend analysis and visualization
  - Create aggregation queries for defect frequency by type over time
  - Implement Chart.js line charts for trend visualization
  - Add date range selector for trend analysis
  - Create comparison view to display multiple inspections side-by-side
  - _Requirements: 13.4, 13.5_

- [x] 22. Set up Docker containerization
  - Create Dockerfile for frontend (Nginx)
  - Create Dockerfile for backend (Node.js)
  - Create Dockerfile for ML service (Python)
  - Create docker-compose.yml with all services (frontend, backend, ML, MongoDB, Redis)
  - Configure environment variables in docker-compose
  - Set up volume mounts for persistent data
  - Configure networking between containers
  - _Requirements: All_

- [x] 23. Implement error handling and logging
  - Create centralized error handler middleware in Express
  - Implement error logging to systemLogs collection
  - Add request logging with Morgan
  - Create Winston logger for backend
  - Implement error boundaries in frontend
  - Add user-friendly error messages for all error scenarios
  - _Requirements: 2.4, 4.4, 11.3, 14.5_

- [x] 24. Add input validation and security measures
  - Implement request validation middleware using express-validator
  - Add rate limiting middleware (100 requests/minute per user)
  - Configure CORS with whitelist
  - Add helmet.js for security headers
  - Implement XSS sanitization for user inputs
  - Add file upload security checks (magic number validation)
  - _Requirements: 1.2, 1.3, 1.4, 4.2, 11.4_

- [x] 25. Create environment configuration
  - Create .env.example file with all required variables
  - Document environment variables in README
  - Set up separate configs for development and production
  - Configure MongoDB connection string
  - Configure AWS S3 credentials
  - Configure OpenAI API key
  - Configure Redis connection
  - _Requirements: All_

- [x] 26. Implement model training workflow (Python)
  - Create training script for YOLOv8
  - Implement data loading and augmentation pipeline
  - Configure training hyperparameters (epochs, batch size, learning rate)
  - Implement validation during training
  - Calculate mAP and other metrics after training
  - Save model weights to S3
  - Update models collection in MongoDB with training results
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 27. Write backend unit tests
  - Write tests for authentication endpoints (register, login, logout)
  - Write tests for user management endpoints
  - Write tests for inspection endpoints
  - Write tests for model management endpoints
  - Write tests for monitoring endpoints
  - Test authentication and authorization middleware
  - Test validation middleware
  - Mock MongoDB and external services
  - _Requirements: All_

- [x] 28. Write frontend unit tests
  - Write tests for form validation logic
  - Write tests for API client functions
  - Write tests for authentication flow
  - Write tests for bounding box rendering
  - Test error handling and display
  - _Requirements: All_

- [x] 29. Write ML service unit tests



  - Write tests for image preprocessing functions
  - Write tests for YOLOv8 inference with sample images
  - Write tests for ensemble aggregation logic
  - Mock GPT Vision API responses
  - Test error handling and retry logic
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 30. Perform integration testing



  - Test complete user registration and login flow
  - Test end-to-end inspection workflow (upload → analyze → results → report)
  - Test admin user management workflow
  - Test admin model management workflow
  - Test with real MongoDB instance
  - _Requirements: All_

- [x] 31. Add API documentation
  - Create API documentation using Swagger/OpenAPI
  - Document all endpoints with request/response examples
  - Add authentication requirements to documentation
  - Host documentation at /api-docs endpoint
  - _Requirements: All_
