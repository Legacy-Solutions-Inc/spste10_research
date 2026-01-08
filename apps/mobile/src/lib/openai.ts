/**
 * OpenAI Vision API service for emergency photo analysis
 * Uses GPT-4o-mini Vision API to analyze emergency photos
 */

import Constants from 'expo-constants';
import { getEmergencyAnalysisPrompt, EMERGENCY_PHOTO_ANALYSIS_SYSTEM_PROMPT } from './openaiPrompts';

// Get API key from environment variables
const getOpenAIApiKey = (): string | null => {
  return (
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
    Constants.expoConfig?.extra?.openaiApiKey ||
    null
  );
};

/**
 * Sanitize error data to remove any API key information
 * @param errorData - Error object that might contain sensitive data
 * @returns Sanitized error object safe for logging
 */
function sanitizeErrorData(errorData: any): any {
  if (!errorData || typeof errorData !== 'object') {
    return errorData;
  }

  const sanitized = JSON.parse(JSON.stringify(errorData)); // Deep clone
  
  // Recursively sanitize nested objects
  if (sanitized.error && typeof sanitized.error === 'object') {
    sanitized.error = { ...sanitized.error };
    
    // Remove or mask API key from error message
    if (sanitized.error.message && typeof sanitized.error.message === 'string') {
      let message = sanitized.error.message;
      
      // Remove OpenAI API key patterns (sk- followed by alphanumeric, typically 48+ chars)
      message = message.replace(/sk-[a-zA-Z0-9]{20,}/g, '***REDACTED***');
      
      // Remove any remaining partial keys that might appear after redaction
      // This catches patterns like "***REDACTED***...xEu0" where part of key still shows
      message = message.replace(/\*{3,}REDACTED\*{3,}[a-zA-Z0-9]+/g, '***REDACTED***');
      
      // Most important: Replace the entire "Incorrect API key provided: ..." pattern
      // This is the specific OpenAI error format that exposes keys
      message = message.replace(
        /Incorrect API key provided:\s*[^.]*/gi,
        'Incorrect API key provided: ***REDACTED***'
      );
      
      // Remove placeholder patterns (from .env.example)
      message = message.replace(/your_[a-zA-Z0-9_]+/gi, '***REDACTED***');
      
      sanitized.error.message = message;
    }
  }
  
  // Remove any direct API key fields
  if (sanitized.apiKey) delete sanitized.apiKey;
  if (sanitized.key) delete sanitized.key;
  if (sanitized.api_key) delete sanitized.api_key;
  
  return sanitized;
}

/**
 * Convert image URI to base64 string
 * @param imageUri - Local file URI from camera
 * @returns Base64 encoded image string
 */
async function imageUriToBase64(imageUri: string): Promise<string> {
  try {
    // For React Native, use XMLHttpRequest for better compatibility
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', imageUri, true);
      xhr.responseType = 'arraybuffer';
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(new Error(`Failed to load file: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error loading file'));
      };
      
      xhr.send();
    });
    
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    return base64;
  } catch (error) {
    console.error('[OpenAI] Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Analyze an emergency photo using OpenAI Vision API
 * @param imageUri - Local file URI of the photo to analyze
 * @returns Generated description of the emergency situation
 */
export async function analyzeEmergencyPhoto(imageUri: string): Promise<string> {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    console.warn('[OpenAI] API key not found. Using fallback description.');
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Convert image to base64
    const base64Image = await imageUriToBase64(imageUri);
    
    // Get the analysis prompt
    const userPrompt = getEmergencyAnalysisPrompt();
    
    // Prepare the API request for OpenAI Chat Completions API
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: EMERGENCY_PHOTO_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500, // Limit to ~200 words
      temperature: 0.4, // Lower temperature for more factual, consistent descriptions
    };

    // Make API call to OpenAI
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Sanitize error data before logging to prevent API key exposure
      const sanitizedError = sanitizeErrorData(errorData);
      // Only log status and error code, not the full error object to avoid any key leakage
      console.error('[OpenAI] API error:', response.status, {
        code: sanitizedError?.error?.code || 'unknown',
        type: sanitizedError?.error?.type || 'unknown',
        message: sanitizedError?.error?.message || 'Unknown error',
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a moment.');
      } else {
        throw new Error(`API request failed: ${response.statusText}`);
      }
    }

    const data = await response.json();
    
    // Extract the generated text from OpenAI response
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      return data.choices[0].message.content.trim();
    } else {
      console.error('[OpenAI] Unexpected API response format:', data);
      throw new Error('Invalid response from AI service');
    }
  } catch (error) {
    // Re-throw with more context if it's already an Error
    if (error instanceof Error) {
      throw error;
    }
    
    // Handle network errors
    console.error('[OpenAI] Error analyzing photo:', error);
    throw new Error('Failed to analyze photo. Please check your internet connection and try again.');
  }
}

/**
 * Check if OpenAI API is configured
 * @returns true if API key is available
 */
export function isOpenAIConfigured(): boolean {
  return getOpenAIApiKey() !== null;
}
