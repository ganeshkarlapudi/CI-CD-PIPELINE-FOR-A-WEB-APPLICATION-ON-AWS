/**
 * Frontend Error Handler
 * Provides centralized error handling and user-friendly error messages
 */

class ErrorHandler {
  constructor() {
    this.errorContainer = null;
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers for uncaught errors
   */
  setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      this.showError('An unexpected error occurred. Please refresh the page.', 'error');
      
      // Log to backend if possible
      this.logErrorToBackend({
        type: 'uncaught_error',
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack,
        url: window.location.href,
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('An unexpected error occurred. Please try again.', 'error');
      
      // Log to backend if possible
      this.logErrorToBackend({
        type: 'unhandled_rejection',
        message: event.reason?.message || 'Promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
      });
    });
  }

  /**
   * Get or create error container
   */
  getErrorContainer() {
    if (!this.errorContainer) {
      this.errorContainer = document.getElementById('error-container');
      
      // Create container if it doesn't exist
      if (!this.errorContainer) {
        this.errorContainer = document.createElement('div');
        this.errorContainer.id = 'error-container';
        this.errorContainer.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          max-width: 400px;
        `;
        document.body.appendChild(this.errorContainer);
      }
    }
    return this.errorContainer;
  }

  /**
   * Show error message to user
   */
  showError(message, type = 'error', duration = 5000) {
    const container = this.getErrorContainer();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${this.getAlertClass(type)} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.style.cssText = 'margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';
    
    alertDiv.innerHTML = `
      <strong>${this.getAlertTitle(type)}</strong> ${this.escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    container.appendChild(alertDiv);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
      }, duration);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message, duration = 3000) {
    this.showError(message, 'success', duration);
  }

  /**
   * Show warning message
   */
  showWarning(message, duration = 4000) {
    this.showError(message, 'warning', duration);
  }

  /**
   * Show info message
   */
  showInfo(message, duration = 3000) {
    this.showError(message, 'info', duration);
  }

  /**
   * Handle API errors
   */
  handleApiError(error, customMessage = null) {
    console.error('API Error:', error);
    
    let message = customMessage || 'An error occurred. Please try again.';
    let type = 'error';
    
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data?.error;
      
      if (errorData) {
        message = this.getUserFriendlyMessage(errorData.code, errorData.message);
        
        // Determine severity
        if (error.response.status >= 500) {
          type = 'error';
        } else if (error.response.status >= 400) {
          type = 'warning';
        }
      }
      
      // Handle specific status codes
      if (error.response.status === 401) {
        message = 'Your session has expired. Please log in again.';
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 2000);
      } else if (error.response.status === 403) {
        message = 'You do not have permission to perform this action.';
      } else if (error.response.status === 404) {
        message = 'The requested resource was not found.';
      }
    } else if (error.request) {
      // Request made but no response received
      message = 'Unable to connect to the server. Please check your internet connection.';
      type = 'error';
    } else {
      // Error in request setup
      message = 'An unexpected error occurred. Please try again.';
      type = 'error';
    }
    
    this.showError(message, type);
    
    // Log to backend
    this.logErrorToBackend({
      type: 'api_error',
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
    });
  }

  /**
   * Get user-friendly error message based on error code
   */
  getUserFriendlyMessage(code, defaultMessage) {
    const messages = {
      'AUTH_FAILED': 'Authentication failed. Please check your credentials.',
      'INVALID_CREDENTIALS': 'Invalid username or password.',
      'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
      'ACCOUNT_LOCKED': defaultMessage, // Use server message for lockout time
      'ACCOUNT_INACTIVE': 'Your account has been deactivated. Please contact support.',
      'USERNAME_EXISTS': 'This username is already taken.',
      'EMAIL_EXISTS': 'This email is already registered.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'INVALID_FILE': 'Invalid file format. Please upload JPEG, PNG, or TIFF images.',
      'FILE_TOO_LARGE': 'File size exceeds the maximum limit of 50MB.',
      'ML_ERROR': 'Error processing image. Please try again or contact support.',
      'DATABASE_ERROR': 'A database error occurred. Please try again later.',
      'NOT_FOUND': 'The requested resource was not found.',
      'FORBIDDEN': 'You do not have permission to access this resource.',
      'CONFLICT': 'A conflict occurred. The resource may already exist.',
      'EXTERNAL_SERVICE_ERROR': 'An external service is temporarily unavailable.',
      'INTERNAL_SERVER_ERROR': 'An internal server error occurred. Please try again later.',
    };
    
    return messages[code] || defaultMessage || 'An error occurred. Please try again.';
  }

  /**
   * Get Bootstrap alert class based on type
   */
  getAlertClass(type) {
    const classes = {
      'error': 'danger',
      'success': 'success',
      'warning': 'warning',
      'info': 'info',
    };
    return classes[type] || 'danger';
  }

  /**
   * Get alert title based on type
   */
  getAlertTitle(type) {
    const titles = {
      'error': 'Error!',
      'success': 'Success!',
      'warning': 'Warning!',
      'info': 'Info:',
    };
    return titles[type] || 'Error!';
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Log error to backend
   */
  async logErrorToBackend(errorData) {
    try {
      const token = localStorage.getItem('token');
      
      // Only log if we have a token (user is logged in)
      if (!token) return;
      
      await fetch('/api/admin/monitoring/logs/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          level: 'error',
          component: 'frontend',
          message: errorData.message || 'Frontend error',
          details: errorData,
        }),
      });
    } catch (error) {
      // Silently fail - don't show error for logging errors
      console.error('Failed to log error to backend:', error);
    }
  }

  /**
   * Clear all error messages
   */
  clearErrors() {
    const container = this.getErrorContainer();
    container.innerHTML = '';
  }

  /**
   * Validate form and show errors
   */
  validateForm(formElement, validationRules) {
    this.clearErrors();
    const errors = [];
    
    for (const [fieldName, rules] of Object.entries(validationRules)) {
      const field = formElement.elements[fieldName];
      if (!field) continue;
      
      const value = field.value.trim();
      
      // Required validation
      if (rules.required && !value) {
        errors.push(`${rules.label || fieldName} is required`);
        field.classList.add('is-invalid');
        continue;
      }
      
      // Min length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${rules.label || fieldName} must be at least ${rules.minLength} characters`);
        field.classList.add('is-invalid');
        continue;
      }
      
      // Max length validation
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${rules.label || fieldName} must not exceed ${rules.maxLength} characters`);
        field.classList.add('is-invalid');
        continue;
      }
      
      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.patternMessage || `${rules.label || fieldName} format is invalid`);
        field.classList.add('is-invalid');
        continue;
      }
      
      // Custom validation
      if (rules.custom && !rules.custom(value)) {
        errors.push(rules.customMessage || `${rules.label || fieldName} is invalid`);
        field.classList.add('is-invalid');
        continue;
      }
      
      // Remove invalid class if validation passes
      field.classList.remove('is-invalid');
      field.classList.add('is-valid');
    }
    
    // Show errors
    if (errors.length > 0) {
      errors.forEach(error => this.showError(error, 'warning', 4000));
      return false;
    }
    
    return true;
  }
}

// Create global instance
const errorHandler = new ErrorHandler();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = errorHandler;
}
