/**
 * Authentication Utility Module
 * Handles token management, authentication checks, and user session management
 */

const Auth = (function() {
    // Configuration
    const API_BASE_URL = window.location.origin + '/api';
    const TOKEN_KEY = 'token';
    const USER_KEY = 'user';
    const TOKEN_EXPIRATION_KEY = 'tokenExpiration';
    const TOKEN_REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours before expiration
    const TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours
    
    // Private variables
    let refreshTimer = null;
    
    /**
     * Store authentication token in localStorage
     * @param {string} token - JWT token
     */
    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
        const expirationTime = Date.now() + TOKEN_LIFETIME;
        localStorage.setItem(TOKEN_EXPIRATION_KEY, expirationTime.toString());
        scheduleTokenRefresh();
    }
    
    /**
     * Get authentication token from localStorage
     * @returns {string|null} JWT token or null if not found
     */
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }
    
    /**
     * Remove authentication token from localStorage
     */
    function removeToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRATION_KEY);
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
    }
    
    /**
     * Store user data in localStorage
     * @param {Object} user - User object
     */
    function setUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    
    /**
     * Get user data from localStorage
     * @returns {Object|null} User object or null if not found
     */
    function getUser() {
        const userStr = localStorage.getItem(USER_KEY);
        if (!userStr) return null;
        
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    
    /**
     * Remove user data from localStorage
     */
    function removeUser() {
        localStorage.removeItem(USER_KEY);
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated, false otherwise
     */
    function isAuthenticated() {
        const token = getToken();
        if (!token) return false;
        
        // Check if token is expired
        const expirationTime = localStorage.getItem(TOKEN_EXPIRATION_KEY);
        if (expirationTime && Date.now() > parseInt(expirationTime)) {
            // Token expired, clear it
            clearAuth();
            return false;
        }
        
        return true;
    }
    
    /**
     * Verify token with backend
     * @returns {Promise<Object|null>} User object if valid, null otherwise
     */
    async function verifyToken() {
        const token = getToken();
        if (!token) return null;
        
        try {
            const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.data.valid && response.data.user) {
                setUser(response.data.user);
                return response.data.user;
            }
            
            return null;
        } catch (error) {
            console.error('Token verification failed:', error);
            clearAuth();
            return null;
        }
    }
    
    /**
     * Clear all authentication data
     */
    function clearAuth() {
        removeToken();
        removeUser();
    }
    
    /**
     * Login user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} Response object with success status and data
     */
    async function login(username, password) {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                username,
                password
            });
            
            if (response.data.success && response.data.token) {
                setToken(response.data.token);
                
                if (response.data.user) {
                    setUser(response.data.user);
                }
                
                return {
                    success: true,
                    user: response.data.user,
                    message: 'Login successful'
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Login failed'
            };
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = 'Invalid username or password';
                } else if (error.response.status === 403) {
                    errorMessage = 'Account is locked. Please try again later.';
                } else if (error.response.data && error.response.data.error) {
                    errorMessage = error.response.data.error.message || errorMessage;
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.request) {
                errorMessage = 'Unable to connect to server. Please check your connection.';
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }
    
    /**
     * Logout user
     * @returns {Promise<Object>} Response object with success status
     */
    async function logout() {
        const token = getToken();
        
        try {
            if (token) {
                await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuth();
        }
        
        return {
            success: true,
            message: 'Logged out successfully'
        };
    }
    
    /**
     * Redirect to login page
     * @param {string} message - Optional message to display
     */
    function redirectToLogin(message = null) {
        clearAuth();
        const loginUrl = 'login.html';
        if (message) {
            window.location.href = `${loginUrl}?message=${encodeURIComponent(message)}`;
        } else {
            window.location.href = loginUrl;
        }
    }
    
    /**
     * Redirect to appropriate dashboard based on user role
     * @param {string} role - User role (user or admin)
     */
    function redirectToDashboard(role) {
        if (role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'user-dashboard.html';
        }
    }
    
    /**
     * Check authentication and redirect if not authenticated
     * @param {boolean} requireAdmin - Whether admin role is required
     * @returns {Object|null} User object if authenticated, null otherwise
     */
    function requireAuth(requireAdmin = false) {
        if (!isAuthenticated()) {
            redirectToLogin('Please log in to continue');
            return null;
        }
        
        const user = getUser();
        
        if (requireAdmin && user && user.role !== 'admin') {
            redirectToLogin('Access denied. Admin privileges required.');
            return null;
        }
        
        return user;
    }
    
    /**
     * Schedule automatic token refresh
     */
    function scheduleTokenRefresh() {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        
        const expirationTime = localStorage.getItem(TOKEN_EXPIRATION_KEY);
        if (!expirationTime) return;
        
        const timeUntilExpiration = parseInt(expirationTime) - Date.now();
        const refreshTime = timeUntilExpiration - TOKEN_REFRESH_THRESHOLD;
        
        if (refreshTime > 0) {
            refreshTimer = setTimeout(async () => {
                await refreshToken();
            }, refreshTime);
        }
    }
    
    /**
     * Refresh authentication token
     * @returns {Promise<boolean>} True if refresh successful, false otherwise
     */
    async function refreshToken() {
        const token = getToken();
        if (!token) return false;
        
        try {
            // Verify token to get a fresh one (if backend supports it)
            const user = await verifyToken();
            
            if (user) {
                // Token is still valid, update expiration
                const expirationTime = Date.now() + TOKEN_LIFETIME;
                localStorage.setItem(TOKEN_EXPIRATION_KEY, expirationTime.toString());
                scheduleTokenRefresh();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
    
    /**
     * Get authorization header for API requests
     * @returns {Object} Headers object with Authorization header
     */
    function getAuthHeaders() {
        const token = getToken();
        if (!token) return {};
        
        return {
            'Authorization': `Bearer ${token}`
        };
    }
    
    /**
     * Initialize authentication module
     * Should be called on page load
     */
    function init() {
        // Schedule token refresh if user is authenticated
        if (isAuthenticated()) {
            scheduleTokenRefresh();
        }
        
        // Handle token expiration
        window.addEventListener('storage', function(e) {
            if (e.key === TOKEN_KEY && !e.newValue) {
                // Token was removed in another tab
                redirectToLogin('Session expired. Please log in again.');
            }
        });
    }
    
    // Public API
    return {
        // Token management
        setToken,
        getToken,
        removeToken,
        
        // User management
        setUser,
        getUser,
        removeUser,
        
        // Authentication
        isAuthenticated,
        verifyToken,
        clearAuth,
        login,
        logout,
        
        // Navigation
        redirectToLogin,
        redirectToDashboard,
        requireAuth,
        
        // Token refresh
        refreshToken,
        scheduleTokenRefresh,
        
        // Utilities
        getAuthHeaders,
        init,
        
        // Constants
        API_BASE_URL
    };
})();

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Auth.init);
} else {
    Auth.init();
}
