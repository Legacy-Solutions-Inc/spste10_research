import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { analyzeEmergencyPhoto, isOpenAIConfigured } from '@/lib/openai';

/**
 * Hook for analyzing emergency photos using OpenAI Vision API
 * Manages loading state, errors, and provides fallback descriptions
 */
export function useAnalyzePhoto() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePhoto = useCallback(async (imageUri: string): Promise<string | null> => {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      // Return null silently - API not configured is expected if user hasn't set it up
      return null;
    }

    setLoading(true);
    setError(null);

    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Set timeout for the analysis (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Analysis timeout')), 30000);
      });

      const analysisPromise = analyzeEmergencyPhoto(imageUri);
      
      // Race between analysis and timeout
      const description = await Promise.race([
        analysisPromise.then((result) => {
          // Clear timeout if analysis completes first
          if (timeoutId) clearTimeout(timeoutId);
          return result;
        }),
        timeoutPromise,
      ]);
      
      if (!description || description.trim().length === 0) {
        throw new Error('Empty description received from AI');
      }

      return description;
    } catch (err) {
      // Clear timeout if error occurs
      if (timeoutId) clearTimeout(timeoutId);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze photo';
      
      // Only log non-configuration errors (API key issues are expected if not set up)
      const isApiKeyError = 
        errorMessage.includes('Invalid API key') || 
        errorMessage.includes('API key not configured') ||
        errorMessage.includes('API key not found');
      
      if (!isApiKeyError && errorMessage !== 'Analysis timeout') {
        console.error('[useAnalyzePhoto] Error:', errorMessage);
      } else if (isApiKeyError) {
        // Log as warning instead of error for API key issues
        console.warn('[useAnalyzePhoto] API key issue - AI analysis unavailable');
      }
      
      setError(errorMessage);
      
      // Don't show alert here - let the calling component handle it
      // This allows for graceful fallback
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analyzePhoto,
    loading,
    error,
    isConfigured: isOpenAIConfigured(),
  };
}
