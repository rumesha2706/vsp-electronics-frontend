// Security Configuration for VSP Electronics Application

export const SECURITY_CONFIG = {
  // Google reCAPTCHA v2 Configuration
  recaptcha: {
    // Get your site key from: https://www.google.com/recaptcha/admin
    siteKey: process.env['RECAPTCHA_SITE_KEY'] || 'YOUR_RECAPTCHA_SITE_KEY',
    secretKey: process.env['RECAPTCHA_SECRET_KEY'] || 'YOUR_RECAPTCHA_SECRET_KEY',
    // reCAPTCHA score threshold (0.0 to 1.0)
    // 1.0 is very likely a legitimate interaction
    // 0.0 is very likely a bot
    scoreThreshold: 0.5,
    // Enable reCAPTCHA for these forms
    enabledForms: {
      login: true,
      signup: true,
      contactForm: true,
      quote: true,
      checkout: true
    }
  },

  // Content Security Policy Headers
  csp: {
    enabled: true,
    // Strict CSP policy - adjust as needed
    policy: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://accounts.google.com',
        'https://www.google.com/recaptcha/',
        'https://www.gstatic.com/recaptcha/',
        'https://smtpjs.com',
        'https://cdnjs.cloudflare.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com'
      ],
      'connect-src': [
        "'self'",
        'https://accounts.google.com',
        'https://www.google.com/recaptcha/',
        'https://www.gstatic.com/recaptcha/',
        'https://www.agarwalelectronics.com'
      ],
      'frame-src': [
        'https://accounts.google.com',
        'https://www.google.com/recaptcha/'
      ],
      'child-src': [
        'https://accounts.google.com',
        'https://www.google.com/recaptcha/'
      ]
    }
  },

  // HTTPS and Other Security Headers
  headers: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  },

  // Rate limiting configuration
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // Max requests per window
  },

  // Input validation rules
  validation: {
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneRegex: /^[\d\s\-\+\(\)]+$/
  }
};

export type SecurityConfig = typeof SECURITY_CONFIG;
