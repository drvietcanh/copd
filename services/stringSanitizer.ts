/**
 * Remove BOM (Byte Order Mark) and other problematic characters
 * BOM character: U+FEFF (65279)
 */
export const removeBOM = (str: string): string => {
  if (!str) return str;
  // Remove BOM (U+FEFF) from start of string
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
};

/**
 * Sanitize string for API transmission
 * Removes BOM and ensures string is safe for ByteString conversion
 */
export const sanitizeString = (str: string): string => {
  if (!str) return str;
  
  // Remove BOM
  let sanitized = removeBOM(str);
  
  // Remove any other problematic characters (non-printable, control chars)
  // Keep only printable ASCII and common Unicode ranges
  sanitized = sanitized
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      // Allow: printable ASCII (32-126), common Unicode ranges, Vietnamese characters
      return (
        (code >= 32 && code <= 126) ||  // Printable ASCII
        (code >= 0x00A0 && code <= 0xFFFF) ||  // Common Unicode (including Vietnamese)
        code === 0x000A ||  // Newline
        code === 0x000D ||  // Carriage return
        code === 0x0009     // Tab
      );
    })
    .join('');
  
  return sanitized.trim();
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};
