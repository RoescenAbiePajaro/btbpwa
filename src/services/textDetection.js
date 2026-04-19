// src/services/textDetection.js

/**
 * Text Detection and Extraction Utility
 * This utility provides text detection and extraction capabilities.
 * For true OCR functionality, Tesseract.js can be integrated in the future.
 */

/**
 * Extract text from text objects array
 * @param {Array} textObjects - Array of text objects with { text, position, color, fontSize, fontFamily }
 * @returns {Object} - Extracted text data with metadata
 */
export const extractTextFromObjects = (textObjects) => {
  if (!textObjects || textObjects.length === 0) {
    return {
      text: '',
      count: 0,
      objects: []
    };
  }

  const extractedText = textObjects
    .map(obj => ({
      text: obj.text || '',
      position: obj.position || { x: 0, y: 0 },
      color: obj.color || '#FFFFFF',
      fontSize: obj.fontSize || 24,
      fontFamily: obj.fontFamily || 'Arial'
    }))
    .filter(obj => obj.text.trim() !== '');

  const combinedText = extractedText
    .map(obj => obj.text)
    .join('\n');

  return {
    text: combinedText,
    count: extractedText.length,
    objects: extractedText
  };
};

/**
 * Detect text regions from canvas (placeholder for OCR integration)
 * This is a simplified version that returns text object positions
 * For true OCR, integrate Tesseract.js:
 * 
 * Example with Tesseract.js:
 * import Tesseract from 'tesseract.js';
 * 
 * const detectTextFromCanvas = async (canvas) => {
 *   const { data: { text } } = await Tesseract.recognize(
 *     canvas,
 *     'eng',
 *     { logger: m => console.log(m) }
 *   );
 *   return text;
 * };
 * 
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @returns {Promise<Object>} - Detected text regions
 */
export const detectTextFromCanvas = async (canvas) => {
  // Placeholder for OCR integration
  // Currently returns text object positions if available
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        detected: false,
        message: 'OCR not enabled. Use text objects for text input.',
        regions: []
      });
    }, 100);
  });
};

/**
 * Get text statistics from text objects
 * @param {Array} textObjects - Array of text objects
 * @returns {Object} - Statistics about the text
 */
export const getTextStatistics = (textObjects) => {
  if (!textObjects || textObjects.length === 0) {
    return {
      totalCharacters: 0,
      totalWords: 0,
      totalLines: 0,
      averageFontSize: 0,
      colorDistribution: {}
    };
  }

  const allText = textObjects.map(obj => obj.text || '').join(' ');
  const words = allText.split(/\s+/).filter(word => word.length > 0);
  const characters = allText.replace(/\s/g, '').length;
  
  const fontSizeSum = textObjects.reduce((sum, obj) => sum + (obj.fontSize || 24), 0);
  const averageFontSize = fontSizeSum / textObjects.length;

  const colorDistribution = textObjects.reduce((dist, obj) => {
    const color = obj.color || '#FFFFFF';
    dist[color] = (dist[color] || 0) + 1;
    return dist;
  }, {});

  return {
    totalCharacters: characters,
    totalWords: words.length,
    totalLines: textObjects.length,
    averageFontSize: Math.round(averageFontSize),
    colorDistribution
  };
};

/**
 * Validate text object structure
 * @param {Object} textObject - Text object to validate
 * @returns {boolean} - Whether the object is valid
 */
export const validateTextObject = (textObject) => {
  if (!textObject || typeof textObject !== 'object') {
    return false;
  }

  const hasText = textObject.text && typeof textObject.text === 'string';
  const hasPosition = textObject.position && 
                      typeof textObject.position.x === 'number' && 
                      typeof textObject.position.y === 'number';
  const hasColor = textObject.color && typeof textObject.color === 'string';
  const hasFontSize = typeof textObject.fontSize === 'number' && textObject.fontSize > 0;

  return hasText && hasPosition && hasColor && hasFontSize;
};

/**
 * Format text for export (JSON, plain text, etc.)
 * @param {Array} textObjects - Array of text objects
 * @param {string} format - Export format ('json', 'text', 'csv')
 * @returns {string} - Formatted text
 */
export const formatTextForExport = (textObjects, format = 'text') => {
  const extracted = extractTextFromObjects(textObjects);

  switch (format) {
    case 'json':
      return JSON.stringify(extracted, null, 2);
    
    case 'csv':
      const headers = 'Text,X,Y,Color,FontSize,FontFamily';
      const rows = extracted.objects.map(obj => 
        `"${obj.text}",${obj.position.x},${obj.position.y},${obj.color},${obj.fontSize},${obj.fontFamily}`
      );
      return [headers, ...rows].join('\n');
    
    case 'text':
    default:
      return extracted.text;
  }
};

/**
 * Search text objects for a specific string
 * @param {Array} textObjects - Array of text objects
 * @param {string} searchTerm - Search term
 * @param {boolean} caseSensitive - Whether search is case sensitive
 * @returns {Array} - Matching text objects with indices
 */
export const searchTextObjects = (textObjects, searchTerm, caseSensitive = false) => {
  if (!textObjects || !searchTerm) {
    return [];
  }

  const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  return textObjects
    .map((obj, index) => ({ ...obj, index }))
    .filter(obj => {
      const text = caseSensitive ? obj.text : obj.text.toLowerCase();
      return text.includes(term);
    });
};
