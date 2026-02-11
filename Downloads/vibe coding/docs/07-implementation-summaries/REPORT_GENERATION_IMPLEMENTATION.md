# Report Generation Implementation

## Overview
Implemented report generation functionality for aircraft inspection results, supporting both JSON and PDF export formats.

## Endpoint

### GET /api/inspections/:id/report

Generate and export inspection report in JSON or PDF format.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `format` (optional): Export format - `json` or `pdf` (default: `json`)

**Response:**
- JSON format: Returns JSON object with inspection data
- PDF format: Returns PDF file download

## Features Implemented

### Task 11.1: JSON Report Export ✅

**Endpoint:** `GET /api/inspections/:id/report?format=json`

**Features:**
- Fetches complete inspection data with all defects
- Includes metadata section:
  - Report ID
  - Generation timestamp
  - Inspection date
  - Aircraft ID
  - Model version
  - Processing time
- Includes image information:
  - URL
  - Filename
  - Dimensions
  - Format
  - Upload timestamp
- Includes summary statistics:
  - Total defects count
  - Defects grouped by class with count and average confidence
- Includes detailed defect list:
  - Class
  - Confidence score (rounded to 2 decimals)
  - Bounding box coordinates
  - Detection source (YOLO/GPT/ensemble)
- Sets appropriate headers for JSON file download
- Filename format: `inspection-report-{inspectionId}.json`

**Example JSON Structure:**
```json
{
  "metadata": {
    "reportId": "507f1f77bcf86cd799439011",
    "generatedAt": "2025-11-14T10:30:00.000Z",
    "inspectionDate": "2025-11-14T09:15:00.000Z",
    "aircraftId": "N12345",
    "modelVersion": "v1.0.0",
    "processingTime": 8500
  },
  "image": {
    "url": "https://s3.amazonaws.com/...",
    "filename": "aircraft-wing-001.jpg",
    "dimensions": { "width": 1920, "height": 1080 },
    "format": "jpeg",
    "uploadedAt": "2025-11-14T09:15:00.000Z"
  },
  "summary": {
    "totalDefects": 5,
    "defectsByClass": [
      { "class": "damaged_rivet", "count": 3, "avgConfidence": 0.87 },
      { "class": "filiform_corrosion", "count": 2, "avgConfidence": 0.92 }
    ]
  },
  "defects": [
    {
      "class": "damaged_rivet",
      "confidence": 0.85,
      "boundingBox": { "x": 120, "y": 340, "width": 45, "height": 45 },
      "source": "ensemble"
    }
  ]
}
```

### Task 11.2: PDF Report Export ✅

**Endpoint:** `GET /api/inspections/:id/report?format=pdf`

**Features:**
- Generates professional PDF report using PDFKit library
- Multi-page support with automatic page breaks
- Includes all sections:
  1. **Title Page:**
     - Report title
  2. **Inspection Details:**
     - Report ID
     - Inspection date
     - Aircraft ID
     - Model version
     - Processing time
     - Generation timestamp
  3. **Image Information:**
     - Filename
     - Format
     - Dimensions
  4. **Summary:**
     - Total defects count
  5. **Defects by Type:**
     - Each defect class with count and average confidence
     - Sorted alphabetically
  6. **Detailed Defect List (Table):**
     - Sequential numbering
     - Defect class
     - Confidence percentage
     - Bounding box coordinates
     - Detection source
     - Formatted table with headers and borders
  7. **Footer:**
     - Generation timestamp
     - System attribution
- Sets appropriate headers for PDF file download
- Filename format: `inspection-report-{inspectionId}.pdf`
- Responsive layout with proper margins and spacing
- Professional typography with varying font sizes

## Validation & Error Handling

Both endpoints include comprehensive validation:

1. **Authentication Check:**
   - Requires valid JWT token
   - Returns 401 if not authenticated

2. **Inspection Existence:**
   - Validates inspection ID exists
   - Returns 404 if not found

3. **Authorization Check:**
   - Users can only access their own inspections
   - Admins can access all inspections
   - Returns 403 if unauthorized

4. **Status Validation:**
   - Only completed inspections can be exported
   - Returns 400 with descriptive message for other statuses

5. **Format Validation:**
   - Validates format parameter is 'json' or 'pdf'
   - Returns 400 for invalid formats

6. **Error Logging:**
   - All errors logged using Winston logger
   - Detailed error messages in development mode

## Requirements Satisfied

**Requirement 8.1:** ✅ Generate Inspection Report with all defects, classifications, confidence scores, and locations

**Requirement 8.2:** ✅ Include original image with annotated bounding boxes (image URL and bbox data included)

**Requirement 8.3:** ✅ Provide export options in PDF and JSON formats

**Requirement 8.4:** ✅ Include metadata (inspection date, aircraft ID, model version)

**Requirement 8.5:** ✅ Organize defects by type with summary statistics for PDF export

## Testing

To test the endpoints:

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Test JSON export:**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:3000/api/inspections/INSPECTION_ID/report?format=json" \
     -o report.json
   ```

3. **Test PDF export:**
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:3000/api/inspections/INSPECTION_ID/report?format=pdf" \
     -o report.pdf
   ```

## Dependencies

- **pdfkit** (v0.14.0): PDF generation library - already installed in package.json
- **axios**: HTTP client for potential image fetching - already installed

## Notes

- PDF generation is synchronous and streams directly to the response
- Large reports with many defects automatically paginate in PDF format
- JSON reports are formatted for readability with proper indentation
- Both formats include the same core data with appropriate formatting for each medium
- Reports can only be generated for completed inspections to ensure data integrity
