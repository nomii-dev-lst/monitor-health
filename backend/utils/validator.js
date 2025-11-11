/**
 * Response validation utility
 * Validates HTTP responses against configured rules
 */

export class ResponseValidator {
  /**
   * Validate response against monitor's validation rules
   * @param {Object} response - Axios response object
   * @param {Object} rules - Validation rules from monitor
   * @returns {Object} { isValid: boolean, errors: string[], details: object }
   */
  static validate(response, rules) {
    const errors = [];
    const details = {
      httpStatus: response.status,
      statusText: response.statusText,
      contentType: response.headers?.['content-type'] || 'unknown',
      contentLength: response.headers?.['content-length'] || 'unknown',
      responseTime: response.headers?.['x-response-time'] || 'N/A',
      server: response.headers?.['server'] || 'unknown',
    };

    if (!rules) {
      return { isValid: true, errors: [], details };
    }

    // Validate HTTP status code
    if (rules.statusCode && response.status !== rules.statusCode) {
      const bodyPreview = this.getBodyPreview(response.data);
      errors.push(
        `Expected status ${rules.statusCode}, got ${response.status} (${response.statusText}). ` +
          `Server: ${details.server}, Content-Type: ${details.contentType}. ` +
          `Response preview: ${bodyPreview}`,
      );
    }

    // Validate required JSON keys
    if (
      rules.requiredKeys &&
      Array.isArray(rules.requiredKeys) &&
      rules.requiredKeys.length > 0
    ) {
      const data = response.data;

      if (typeof data !== 'object' || data === null) {
        errors.push('Response must be a JSON object to validate required keys');
      } else {
        for (const key of rules.requiredKeys) {
          if (!this.hasNestedKey(data, key)) {
            errors.push(`Missing required key: ${key}`);
          }
        }
      }
    }

    // Validate response contains specific values
    if (rules.containsValue) {
      const data = JSON.stringify(response.data);
      for (const [key, value] of Object.entries(rules.containsValue)) {
        if (!data.includes(value)) {
          errors.push(
            `Response does not contain expected value for ${key}: ${value}`,
          );
        }
      }
    }

    // Custom validation expression (simple string match)
    if (rules.customCheck) {
      try {
        const data = response.data;
        // Simple evaluation - check if a path exists and meets condition
        // For security, we only support basic checks, not eval()
        const isValid = this.evaluateSimpleCondition(data, rules.customCheck);
        if (!isValid) {
          errors.push(`Custom validation failed: ${rules.customCheck}`);
        }
      } catch (error) {
        errors.push(`Custom validation error: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      details,
    };
  }

  /**
   * Check if nested key exists in object (supports dot notation)
   * @param {Object} obj
   * @param {String} path - e.g., 'data.users' or 'status'
   * @returns {Boolean}
   */
  static hasNestedKey(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return true;
  }

  /**
   * Get nested value from object
   * @param {Object} obj
   * @param {String} path
   * @returns {*}
   */
  static getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Simple condition evaluator (safe, no eval)
   * Supports: path > value, path < value, path === value, path.length > value
   * @param {Object} data
   * @param {String} condition
   * @returns {Boolean}
   */
  static evaluateSimpleCondition(data, condition) {
    // Example: "data.users.length > 0"
    const operators = ['>=', '<=', '===', '!==', '>', '<'];

    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map((s) => s.trim());
        const leftValue = this.getNestedValue(data, left);
        const rightValue = isNaN(right)
          ? right.replace(/['"]/g, '')
          : Number(right);

        switch (op) {
          case '>':
            return leftValue > rightValue;
          case '<':
            return leftValue < rightValue;
          case '>=':
            return leftValue >= rightValue;
          case '<=':
            return leftValue <= rightValue;
          case '===':
            return leftValue === rightValue;
          case '!==':
            return leftValue !== rightValue;
        }
      }
    }

    // If no operator, just check if path exists
    return this.hasNestedKey(data, condition);
  }

  /**
   * Get a preview of the response body for error messages
   * @param {*} data - Response data
   * @returns {String} - Preview string
   */
  static getBodyPreview(data) {
    try {
      if (data === null || data === undefined) {
        return '[empty response]';
      }

      if (typeof data === 'string') {
        // For HTML/text responses, show first 200 chars
        const preview = data.substring(0, 200).replace(/\s+/g, ' ').trim();
        return data.length > 200 ? `${preview}...` : preview;
      }

      if (typeof data === 'object') {
        // For JSON responses, show structure
        const str = JSON.stringify(data, null, 0);
        if (str.length > 200) {
          return `${str.substring(0, 200)}... [${str.length} chars total]`;
        }
        return str;
      }

      return String(data).substring(0, 200);
    } catch (error) {
      return '[unable to parse response] ' + error.message;
    }
  }
}

export default ResponseValidator;
