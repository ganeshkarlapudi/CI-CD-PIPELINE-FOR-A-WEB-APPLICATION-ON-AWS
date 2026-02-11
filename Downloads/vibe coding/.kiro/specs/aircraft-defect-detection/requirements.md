# Requirements Document

## Introduction

This document outlines the requirements for a dynamic web application that leverages deep learning and computer vision to automate aircraft visual inspections. The system integrates YOLOv8-based defect detection with GPT Vision API analysis to identify and classify aircraft defects including damaged/missing rivets, filiform corrosion, and missing panels. The application aims to achieve 95% mean Average Precision (mAP) through ensemble machine learning models, reducing inspection time while enhancing reliability and safety for ground personnel.

## Glossary

- **Detection System**: The web application that processes aircraft images and identifies defects
- **YOLOv8 Model**: A deep-learning object detection framework used for real-time defect identification
- **GPT Vision API**: OpenAI's vision analysis service integrated for enhanced defect analysis
- **Ensemble Model**: A combination of multiple machine learning models working together to improve prediction accuracy
- **UAS**: Unmanned Aircraft System (drone) equipped with camera for capturing inspection images
- **Bounding Box**: A rectangular overlay on images that highlights detected defect locations
- **mAP**: Mean Average Precision, a metric measuring object detection accuracy
- **Defect Classes**: Categories of aircraft damage including damaged rivets, missing rivets, filiform corrosion, missing panels, paint detachment, scratches, composite damage, random damage, burn marks, scorch marks, metal fatigue, and cracks
- **Image Repository**: Storage system for uploaded aircraft inspection images
- **Inspection Report**: Generated document containing detected defects with confidence scores and locations
- **Database**: MongoDB database system used to store user data, inspection records, and system information in collection format
- **MongoDB Database**: NoSQL database system used to store user data, inspection records, and system metadata in collection format
- **User Collection**: MongoDB collection storing user account information including credentials, roles, and profile data
- **Inspection Collection**: MongoDB collection storing inspection records with image references, detection results, and timestamps

## Requirements

### Requirement 1

**User Story:** As a new user, I want to register an account, so that I can access the aircraft defect detection system.

#### Acceptance Criteria

1. WHEN a new user accesses the Detection System, THE Detection System SHALL display a registration page with fields for username, email, password, and password confirmation
2. WHEN the user submits the registration form, THE Detection System SHALL validate that the username is unique and not already registered
3. WHEN the user submits the registration form, THE Detection System SHALL validate that the email format is valid and not already registered
4. THE Detection System SHALL enforce password complexity requirements including minimum 8 characters, at least one uppercase letter, one lowercase letter, one numeric digit, and one special character
5. WHEN the password and password confirmation do not match, THE Detection System SHALL display an error message and prevent registration
6. WHEN registration is successful, THE Detection System SHALL store the user data in the User Collection with the password encrypted using bcrypt hashing algorithm
7. WHEN registration is successful, THE Detection System SHALL assign the default role of User to the new account
8. WHEN registration is successful, THE Detection System SHALL redirect the user to the login page with a success message

### Requirement 2

**User Story:** As a registered user, I want to log into the system, so that I can access my inspection dashboard and perform defect detection.

#### Acceptance Criteria

1. WHEN a user accesses the Detection System, THE Detection System SHALL display a login page with fields for username and password
2. WHEN the user submits login credentials, THE Detection System SHALL authenticate the credentials against the User Collection in the MongoDB Database
3. WHEN the user submits login credentials, THE Detection System SHALL verify the password using bcrypt comparison against the stored hashed password
4. IF the credentials are invalid, THEN THE Detection System SHALL display an error message indicating incorrect username or password and prevent access
5. WHEN authentication is successful, THE Detection System SHALL create a secure session token with expiration time of 24 hours
6. WHEN authentication is successful and the user role is User, THE Detection System SHALL redirect to the user dashboard interface
7. WHEN authentication is successful and the user role is Administrator, THE Detection System SHALL redirect to the admin dashboard interface
8. THE Detection System SHALL implement account lockout after 5 consecutive failed login attempts within 15 minutes

### Requirement 3

**User Story:** As a logged-in user, I want to securely log out of the system, so that I can protect my account when finished.

#### Acceptance Criteria

1. WHEN a user clicks the logout button, THE Detection System SHALL invalidate the current session token
2. WHEN logout is completed, THE Detection System SHALL redirect the user to the login page
3. WHEN a user attempts to access protected pages after logout, THE Detection System SHALL redirect to the login page with a message indicating session expiration
4. THE Detection System SHALL automatically log out users after 24 hours of inactivity

### Requirement 4

**User Story:** As an aircraft maintenance inspector, I want to upload images captured by UAS to the web application, so that I can initiate automated defect detection analysis.

#### Acceptance Criteria

1. WHEN the inspector accesses the upload interface, THE Detection System SHALL display a file selection interface that accepts image formats including JPEG, PNG, and TIFF
2. WHEN the inspector selects one or more images, THE Detection System SHALL validate file size does not exceed 50MB per image
3. WHEN valid images are uploaded, THE Detection System SHALL store the images in the Image Repository with unique identifiers and timestamps
4. IF an uploaded file is corrupted or in an unsupported format, THEN THE Detection System SHALL display an error message specifying the issue and reject the upload
5. WHILE images are uploading, THE Detection System SHALL display a progress indicator showing percentage completion

### Requirement 5

**User Story:** As an aircraft maintenance inspector, I want the system to detect defects using multiple ML models, so that I can achieve high accuracy in defect identification.

#### Acceptance Criteria

1. WHEN an image is submitted for analysis, THE Detection System SHALL process the image through the YOLOv8 Model to identify potential defects
2. WHEN the YOLOv8 Model completes initial detection, THE Detection System SHALL send the image and detected regions to the GPT Vision API for secondary analysis
3. THE Detection System SHALL combine predictions from the YOLOv8 Model and GPT Vision API using ensemble techniques to generate final defect classifications
4. THE Ensemble Model SHALL achieve a validation mean Average Precision of at least 95% across all Defect Classes
5. WHEN multiple models produce conflicting predictions, THE Detection System SHALL apply weighted voting based on individual model confidence scores

### Requirement 6

**User Story:** As an aircraft maintenance inspector, I want to view detected defects with bounding boxes and confidence scores, so that I can quickly identify and assess problem areas.

#### Acceptance Criteria

1. WHEN defect detection completes, THE Detection System SHALL display the analyzed image with Bounding Boxes overlaid on each detected defect
2. THE Detection System SHALL label each Bounding Box with the defect type and confidence score as a percentage
3. WHEN the inspector hovers over a Bounding Box, THE Detection System SHALL display detailed information including defect classification, confidence score, and pixel coordinates
4. THE Detection System SHALL use distinct colors for each Defect Class to enable rapid visual differentiation
5. WHEN no defects are detected with confidence above 50%, THE Detection System SHALL display a message indicating no significant defects were found

### Requirement 7

**User Story:** As an aircraft maintenance inspector, I want to filter and sort detected defects by type and severity, so that I can prioritize critical issues.

#### Acceptance Criteria

1. WHEN viewing detection results, THE Detection System SHALL provide filter controls for each Defect Class including damaged rivets, missing rivets, filiform corrosion, missing panels, paint detachment, scratches, composite damage, random damage, burn marks, scorch marks, metal fatigue, and cracks
2. WHEN the inspector applies a filter, THE Detection System SHALL display only Bounding Boxes matching the selected Defect Classes
3. THE Detection System SHALL provide a sorting mechanism that orders defects by confidence score in descending order
4. WHEN the inspector selects a severity threshold, THE Detection System SHALL hide detections with confidence scores below the specified percentage
5. THE Detection System SHALL display a summary count of defects for each Defect Class in the current view

### Requirement 8

**User Story:** As an aircraft maintenance inspector, I want to generate and export inspection reports, so that I can document findings for maintenance records.

#### Acceptance Criteria

1. WHEN the inspector requests a report, THE Detection System SHALL generate an Inspection Report containing all detected defects with their classifications, confidence scores, and locations
2. THE Inspection Report SHALL include the original image with annotated Bounding Boxes
3. THE Detection System SHALL provide export options in PDF and JSON formats
4. THE Inspection Report SHALL include metadata such as inspection date, image source identifier, and model version information
5. WHEN exporting to PDF, THE Detection System SHALL organize defects by type with summary statistics for each Defect Class

### Requirement 9

**User Story:** As a user, I want to access a dedicated user interface, so that I can perform inspection tasks without administrative complexity.

#### Acceptance Criteria

1. WHEN a user logs into the Detection System, THE Detection System SHALL display the user dashboard interface with access to image upload, analysis results, and inspection history
2. THE Detection System SHALL restrict user interface access to inspection-related functions only, excluding administrative controls
3. WHEN a user navigates the interface, THE Detection System SHALL provide intuitive navigation between upload, results, history, and report sections
4. THE Detection System SHALL display user-specific inspection statistics including total images analyzed and defects detected
5. THE Detection System SHALL provide a responsive interface that adapts to desktop and tablet screen sizes

### Requirement 10

**User Story:** As a system administrator, I want to access a dedicated admin interface, so that I can manage system configuration, users, and ML models.

#### Acceptance Criteria

1. WHEN an administrator logs into the Detection System, THE Detection System SHALL display the admin dashboard interface with access to user management, model management, and system monitoring
2. WHERE the administrator has appropriate permissions, THE Detection System SHALL provide an interface to upload new training datasets
3. WHEN new training data is uploaded, THE Detection System SHALL validate that images are properly labeled with Defect Classes
4. WHERE model retraining is initiated, THE Detection System SHALL execute the training process and display progress metrics including loss and mAP
5. WHEN retraining completes, THE Detection System SHALL validate the new model achieves at least 95% mAP before deployment
6. THE Detection System SHALL maintain version history of deployed models with performance metrics for each version
7. THE Detection System SHALL provide user management capabilities including creating, updating, and deactivating user accounts

### Requirement 11

**User Story:** As a system administrator, I want to control user access and permissions, so that I can ensure system security and appropriate access levels.

#### Acceptance Criteria

1. WHEN an administrator creates a new user account, THE Detection System SHALL require username, password, email, and role assignment
2. THE Detection System SHALL support two role types: User and Administrator with distinct permission sets
3. WHEN a user attempts to access admin-only features, THE Detection System SHALL deny access and display an authorization error message
4. THE Detection System SHALL enforce password complexity requirements including minimum 8 characters, uppercase, lowercase, and numeric characters
5. WHEN a user account is deactivated, THE Detection System SHALL immediately revoke access and prevent login attempts
6. THE Detection System SHALL store all user account data in the User Collection within the MongoDB Database
7. WHEN user data is stored, THE Detection System SHALL encrypt sensitive fields including passwords using bcrypt hashing algorithm

### Requirement 12

**User Story:** As an aircraft maintenance inspector, I want the system to process images efficiently, so that I can complete inspections within acceptable timeframes.

#### Acceptance Criteria

1. WHEN a single image is submitted for analysis, THE Detection System SHALL complete processing and display results within 10 seconds
2. WHEN multiple images are submitted in batch, THE Detection System SHALL process them concurrently with a maximum of 5 images processed simultaneously
3. WHILE processing is ongoing, THE Detection System SHALL display real-time status updates for each image in the queue
4. IF processing time exceeds 30 seconds for a single image, THEN THE Detection System SHALL log a performance warning and notify the inspector
5. THE Detection System SHALL cache model weights in memory to minimize loading time between requests

### Requirement 13

**User Story:** As an aircraft maintenance inspector, I want to review historical inspection data, so that I can track defect trends over time.

#### Acceptance Criteria

1. WHEN the inspector accesses the history interface, THE Detection System SHALL display a list of previous inspections sorted by date in descending order
2. THE Detection System SHALL provide search functionality to filter inspections by date range, aircraft identifier, or Defect Class
3. WHEN the inspector selects a historical inspection, THE Detection System SHALL display the original analysis results including images and detected defects
4. THE Detection System SHALL generate trend visualizations showing defect frequency by type over selectable time periods
5. THE Detection System SHALL allow comparison of multiple inspections side-by-side to identify recurring defect patterns
6. THE Detection System SHALL store all inspection records in the Inspection Collection within the MongoDB Database with indexed fields for efficient querying
7. WHEN an inspection is completed, THE Detection System SHALL persist the inspection data including user identifier, timestamp, image references, detected defects, and confidence scores to the MongoDB Database

### Requirement 14

**User Story:** As a system administrator, I want to monitor system performance and API usage, so that I can ensure reliable operation and manage costs.

#### Acceptance Criteria

1. THE Detection System SHALL log all API calls to the GPT Vision API with timestamps, response times, and token usage
2. WHEN the administrator accesses the monitoring dashboard, THE Detection System SHALL display metrics including total images processed, average processing time, and API costs
3. THE Detection System SHALL generate alerts when API usage approaches 80% of configured monthly limits
4. THE Detection System SHALL track model inference times separately for YOLOv8 Model and GPT Vision API components
5. WHEN system errors occur, THE Detection System SHALL log error details and display them in the monitoring dashboard with severity levels

### Requirement 15

**User Story:** As an aircraft maintenance inspector, I want the system to handle various image qualities and lighting conditions, so that I can analyze images captured in different environments.

#### Acceptance Criteria

1. WHEN an image with low resolution is uploaded, THE Detection System SHALL apply preprocessing to enhance image quality before analysis
2. THE Detection System SHALL normalize image brightness and contrast to optimize detection performance across varying lighting conditions
3. WHEN an image contains significant glare or shadows, THE Detection System SHALL apply adaptive filtering to improve defect visibility
4. THE Detection System SHALL support images with resolutions ranging from 640x640 to 4096x4096 pixels
5. IF image quality is insufficient for reliable detection, THEN THE Detection System SHALL display a warning message with a quality score below 60%
