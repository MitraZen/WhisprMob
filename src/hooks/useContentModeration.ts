/**
 * useContentModeration Hook
 * Provides real-time content moderation for text input
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { contentModerationService, ModerationResult } from '@/services/contentModerationService';

interface UseContentModerationOptions {
  debounceMs?: number; // Debounce delay for moderation checks
  onViolation?: (result: ModerationResult) => void; // Callback when violations are detected
}

export const useContentModeration = (options: UseContentModerationOptions = {}) => {
  const { debounceMs = 500, onViolation } = options;
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check content for violations
   */
  const checkContent = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) {
      setModerationResult(null);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the check
    setIsChecking(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await contentModerationService.checkContent(text);
        setModerationResult(result);
        
        if (onViolation && (!result.isAllowed || result.violations.length > 0)) {
          onViolation(result);
        }
      } catch (error) {
        console.error('Error checking content:', error);
        // On error, allow content (fail open)
        setModerationResult({
          isAllowed: true,
          violations: [],
          severity: 'soft',
          action: 'warn',
          message: '',
          canEdit: true,
        });
      } finally {
        setIsChecking(false);
      }
    }, debounceMs);
  }, [debounceMs, onViolation]);

  /**
   * Clear moderation result
   */
  const clearResult = useCallback(() => {
    setModerationResult(null);
  }, []);

  /**
   * Check if content can be sent
   */
  const canSend = useCallback((text: string): boolean => {
    if (!moderationResult) return true;
    return moderationResult.isAllowed;
  }, [moderationResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    moderationResult,
    isChecking,
    checkContent,
    clearResult,
    canSend,
  };
};

export default useContentModeration;

