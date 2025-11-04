import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Authentication service for monitored APIs
 * Handles different auth methods: basic, token, login
 */

export class AuthService {
  
  /**
   * Authenticate and return headers/cookies for the monitor request
   * @param {Object} monitor - Monitor document with authType and authConfig
   * @returns {Object} { headers: {}, cookies: '' } or null if auth fails
   */
  static async authenticate(monitor) {
    const { authType, authConfig } = monitor;

    try {
      switch (authType) {
        case 'none':
          return { headers: {}, cookies: '' };
        
        case 'basic':
          return this.basicAuth(authConfig);
        
        case 'token':
          return await this.tokenAuth(authConfig);
        
        case 'login':
          return await this.loginAuth(authConfig);
        
        default:
          logger.warn(`Unknown auth type: ${authType}`);
          return { headers: {}, cookies: '' };
      }
    } catch (error) {
      logger.error(`Authentication failed for monitor ${monitor.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Basic Authentication
   * @param {Object} config - { username, password }
   */
  static basicAuth(config) {
    const { username, password } = config;
    
    if (!username || !password) {
      throw new Error('Basic auth requires username and password');
    }

    const token = Buffer.from(`${username}:${password}`).toString('base64');
    
    return {
      headers: {
        'Authorization': `Basic ${token}`
      },
      cookies: ''
    };
  }

  /**
   * Token-based authentication (fetch token from endpoint)
   * @param {Object} config - { tokenUrl, username, password, tokenField, headerName }
   */
  static async tokenAuth(config) {
    const { 
      tokenUrl, 
      username, 
      password, 
      tokenField = 'token',
      headerName = 'Authorization',
      headerPrefix = 'Bearer'
    } = config;

    if (!tokenUrl) {
      throw new Error('Token auth requires tokenUrl');
    }

    // Request token
    const response = await axios.post(tokenUrl, {
      username,
      password
    }, {
      timeout: 10000
    });

    // Extract token from response
    const token = this.extractValue(response.data, tokenField);
    
    if (!token) {
      throw new Error(`Token not found in response at field: ${tokenField}`);
    }

    const authValue = headerPrefix ? `${headerPrefix} ${token}` : token;

    return {
      headers: {
        [headerName]: authValue
      },
      cookies: ''
    };
  }

  /**
   * Login-based authentication (get session cookie)
   * @param {Object} config - { loginUrl, username, password, cookieName, tokenField }
   */
  static async loginAuth(config) {
    const {
      loginUrl,
      username,
      password,
      cookieName = 'session',
      tokenField = null
    } = config;

    if (!loginUrl) {
      throw new Error('Login auth requires loginUrl');
    }

    const response = await axios.post(loginUrl, {
      username,
      password
    }, {
      timeout: 10000,
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });

    // Extract cookie from response
    const cookies = response.headers['set-cookie'];
    
    if (tokenField) {
      // Token in response body
      const token = this.extractValue(response.data, tokenField);
      return {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cookies: ''
      };
    } else if (cookies) {
      // Session cookie
      const sessionCookie = cookies.find(c => c.includes(cookieName));
      return {
        headers: {},
        cookies: sessionCookie || cookies[0]
      };
    }

    throw new Error('No authentication token or cookie found in login response');
  }

  /**
   * Extract value from nested object using dot notation
   * @param {Object} obj 
   * @param {String} path - e.g., 'data.token' or 'access_token'
   */
  static extractValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }
}

export default AuthService;
