# Admin Monitoring Endpoints Implementation

## Overview
Implemented the admin monitoring metrics endpoint that aggregates data from inspections, API logs, and system logs collections to provide comprehensive system metrics.

## Endpoint Implemented

### GET /api/admin/monitoring/metrics

**Description:** Retrieves system-wide metrics including inspection statistics, API usage, costs, performance data, and error counts.

**Access:** Admin only (requires authentication and admin role)

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string for the start of the date range (default: 30 days ago)
- `endDate` (optional): ISO 8601 date string for the end of the date range (default: current date)

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "dateRange": {
      "start": "2024-10-15T00:00:00.000Z",
      "end": "2024-11-14T00:00:00.000Z"
    },
    "inspections": {
      "total": 150,
      "completed": 145,
      "failed": 5,
      "completionRate": "96.67%"
    },
    "performance": {
      "avgProcessingTime": 8500,
      "minProcessingTime": 5200,
      "maxProcessingTime": 12000,
      "unit": "milliseconds"
    },
    "apiUsage": {
      "total": 300,
      "byService": [
        {
          "service": "yolo",
          "calls": 150,
          "avgResponseTime": 3500,
          "totalCost": 0,
          "errorCount": 2,
          "successRate": "98.67%"
        },
        {
          "service": "gpt-vision",
          "calls": 150,
          "avgResponseTime": 5000,
          "totalCost": 45.50,
          "errorCount": 3,
          "successRate": "98.00%"
        }
      ]
    },
    "apiCosts": {
      "total": 45.50,
      "totalCalls": 150,
      "gptVision": {
        "calls": 150,
        "totalCost": 45.50,
        "avgCostPerCall": "0.3033"
      }
    },
    "errors": {
      "total": 12,
      "byLevel": {
        "error": 8,
        "warning": 3,
        "critical": 1
      }
    },
    "users": {
      "active": 25
    }
  },
  "timestamp": "2024-11-14T10:30:00.000Z"
}
```

## Implementation Details

### Data Aggregation
The endpoint performs parallel queries to multiple collections for optimal performance:

1. **Inspection Metrics:**
   - Total inspections count
   - Completed inspections count
   - Average, min, and max processing times
   - Completion rate calculation

2. **API Usage Metrics:**
   - Total API calls by service (YOLO, GPT Vision, Ensemble)
   - Average response times per service
   - Error counts and success rates
   - Cost tracking for GPT Vision API

3. **Cost Metrics:**
   - Total API costs across all services
   - GPT Vision specific costs and per-call averages
   - Total API call counts

4. **Error Metrics:**
   - Error counts grouped by severity level (info, warning, error, critical)
   - Total error count

5. **User Metrics:**
   - Active users count (users who logged in during the period)

### Database Queries
The implementation uses MongoDB aggregation pipelines and static methods:

- `Inspection.countDocuments()` - Count inspections by status
- `Inspection.aggregate()` - Calculate average processing times
- `ApiLog.getTotalCost()` - Aggregate API costs
- `ApiLog.getUsageByService()` - Group API usage by service
- `SystemLog.getErrorCountByLevel()` - Count errors by severity
- `User.countDocuments()` - Count active users

### Error Handling
- Validates date range format and logic
- Returns appropriate error codes for invalid inputs
- Logs all errors for debugging
- Provides detailed error messages in development mode

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 14.1:** Logs all API calls with timestamps, response times, and token usage
- **Requirement 14.2:** Displays metrics including total images processed, average processing time, and API costs
- **Requirement 14.3:** Generates alerts when API usage approaches limits (data available for frontend implementation)
- **Requirement 14.4:** Tracks model inference times separately for YOLOv8 and GPT Vision API

## Testing

Added test functions to `test-admin-endpoints.js`:
- `testGetMonitoringMetrics()` - Tests basic metrics retrieval
- `testGetMonitoringMetricsWithDateRange()` - Tests metrics with custom date range

To run the tests:
```bash
node test-admin-endpoints.js
```

## Files Modified

1. **src/routes/admin.js**
   - Added imports for Inspection, ApiLog, and SystemLog models
   - Implemented GET /api/admin/monitoring/metrics endpoint
   - Added comprehensive data aggregation logic
   - Implemented date range filtering and validation

2. **test-admin-endpoints.js**
   - Added test functions for monitoring metrics endpoint
   - Added tests to the test suite execution

## Usage Example

```javascript
// Get metrics for the last 30 days (default)
GET /api/admin/monitoring/metrics
Headers: { Authorization: "Bearer <admin_token>" }

// Get metrics for a specific date range
GET /api/admin/monitoring/metrics?startDate=2024-11-01&endDate=2024-11-14
Headers: { Authorization: "Bearer <admin_token>" }
```

## Notes

- The endpoint requires admin authentication and authorization
- Default date range is 30 days if not specified
- All processing times are returned in milliseconds
- Costs are tracked in the currency configured in the API logs
- The endpoint performs parallel queries for optimal performance
- Success rates are calculated as percentages with 2 decimal places
