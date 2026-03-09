(function () {
    // Centralized configuration for the frontend
    // If we're on GitHub Pages, we use the injected RENDER_BACKEND_URL
    // Otherwise, we default to the current origin (usually localhost)

    let API_URL = window.location.origin;

    // The __BACKEND_URL_PLACEHOLDER__ string is replaced during the GitHub Actions build process
    const productionUrl = '__BACKEND_URL_PLACEHOLDER__';

    if (productionUrl && !productionUrl.startsWith('__')) {
        API_URL = productionUrl;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development: point to the backend server port (3000)
        // If the page is served from a different port (e.g. Live Server on :5500),
        // API calls must still go to where the Node.js server actually listens.
        API_URL = 'http://localhost:3000';
    }

    // External auth API (register/login)
    let EXTERNAL_AUTH_URL = 'https://users.coderf5.es/v1';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        EXTERNAL_AUTH_URL = 'http://127.0.0.1:8000';
    }

    const config = { API_URL, EXTERNAL_AUTH_URL };

    if (typeof window !== 'undefined') {
        window.APP_CONFIG = config;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = config;
    }
})();
