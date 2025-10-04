/**
 * Content sanitization utilities for security
 */

// Maximum allowed lengths
export const MAX_CONTENT_LENGTH = 5000;
export const MAX_USERNAME_LENGTH = 20;
export const MAX_BIO_LENGTH = 500;

/**
 * Remove dangerous Unicode characters and control characters
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  // Remove null bytes and control characters except newlines and tabs
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Remove zero-width characters that could be used for obfuscation
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Remove direction override characters
  sanitized = sanitized.replace(/[\u202A-\u202E]/g, '');
  
  return sanitized.trim();
};

/**
 * Validate and sanitize content length
 */
export const validateContentLength = (
  content: string, 
  maxLength: number
): { valid: boolean; error?: string } => {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Content cannot be empty' };
  }
  
  if (content.length > maxLength) {
    return { valid: false, error: `Content must be less than ${maxLength} characters` };
  }
  
  return { valid: true };
};

/**
 * Sanitize username - alphanumeric and underscore only
 */
export const sanitizeUsername = (username: string): string => {
  if (!username) return '';
  return username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, MAX_USERNAME_LENGTH);
};

/**
 * Check for spam patterns
 */
export const detectSpamPatterns = (text: string): boolean => {
  if (!text) return false;
  
  // Check for excessive repeated characters (more than 10 in a row)
  if (/(.)\1{10,}/.test(text)) return true;
  
  // Check for excessive URLs (more than 3)
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) return true;
  
  // Check for excessive capitalization (more than 70% caps)
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 10 && upperCount / letterCount > 0.7) return true;
  
  return false;
};
