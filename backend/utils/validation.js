/**
 * Validation utilities for user input
 */

/**
 * Validate email format
 * @param {String} email - Email address
 * @returns {Object} { isValid: boolean, error: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (trimmedEmail.length > 255) {
    return { isValid: false, error: 'Email is too long (max 255 characters)' };
  }

  return { isValid: true, error: null };
}

/**
 * Validate username
 * @param {String} username - Username
 * @returns {Object} { isValid: boolean, error: string }
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmedUsername = username.trim();

  if (trimmedUsername.length === 0) {
    return { isValid: false, error: 'Username cannot be empty' };
  }

  if (trimmedUsername.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (trimmedUsername.length > 50) {
    return { isValid: false, error: 'Username is too long (max 50 characters)' };
  }

  // Allow alphanumeric, underscore, and hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;

  if (!usernameRegex.test(trimmedUsername)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { isValid: true, error: null };
}

/**
 * Validate password strength
 * @param {String} password - Password
 * @returns {Object} { isValid: boolean, error: string, strength: string }
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required', strength: 'none' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long', strength: 'weak' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (max 128 characters)', strength: 'none' };
  }

  // Check password strength
  let strength = 'weak';
  let strengthScore = 0;

  // Has lowercase
  if (/[a-z]/.test(password)) {strengthScore++;}

  // Has uppercase
  if (/[A-Z]/.test(password)) {strengthScore++;}

  // Has number
  if (/[0-9]/.test(password)) {strengthScore++;}

  // Has special character
  if (/[^a-zA-Z0-9]/.test(password)) {strengthScore++;}

  // Length bonus
  if (password.length >= 12) {strengthScore++;}

  if (strengthScore >= 4) {
    strength = 'strong';
  } else if (strengthScore >= 3) {
    strength = 'medium';
  }

  // Require at least medium strength
  if (strengthScore < 2) {
    return {
      isValid: false,
      error: 'Password must contain at least 2 of: uppercase, lowercase, numbers, special characters',
      strength: 'weak'
    };
  }

  return { isValid: true, error: null, strength };
}

/**
 * Validate signup data
 * @param {Object} data - Signup data { username, email, password }
 * @returns {Object} { isValid: boolean, errors: object }
 */
export function validateSignupData(data) {
  const errors = {};

  // Validate username
  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.isValid) {
    errors.username = usernameValidation.error;
  }

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Sanitize user input
 * @param {String} input - User input
 * @returns {String} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {return '';}

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

export default {
  validateEmail,
  validateUsername,
  validatePassword,
  validateSignupData,
  sanitizeInput
};
