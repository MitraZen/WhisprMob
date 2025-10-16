import React, { useEffect, useRef, useCallback } from 'react';
import { Walkthrough } from '@/components/Walkthrough';
import { useWalkthrough } from '@/store/WalkthroughContext';

interface WalkthroughManagerProps {
  walkthroughId?: string;
  autoShow?: boolean;
  context?: string;
  userId?: string;
}

export const WalkthroughManager: React.FC<WalkthroughManagerProps> = ({
  walkthroughId,
  autoShow = false,
  context,
  userId,
}) => {
  const {
    isVisible,
    currentWalkthrough,
    currentStep,
    showWalkthrough,
    hideWalkthrough,
    nextStep,
    previousStep,
    setStep,
    completeWalkthrough,
    skipWalkthrough,
    shouldShowWalkthrough,
    isLoading,
  } = useWalkthrough();

  // Prevent multiple auto-show attempts
  const autoShowAttempted = useRef(false);
  const autoShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-show function
  const debouncedAutoShow = useCallback(async () => {
    if (!autoShow || !walkthroughId || autoShowAttempted.current || isLoading) {
      return;
    }

    autoShowAttempted.current = true;
    
    try {
      const shouldShow = await shouldShowWalkthrough(walkthroughId, userId);
      if (shouldShow && !isVisible) {
        await showWalkthrough(walkthroughId, userId);
      }
    } catch (error) {
      console.error('Auto-show walkthrough error:', error);
      autoShowAttempted.current = false; // Reset on error
    }
  }, [autoShow, walkthroughId, userId, shouldShowWalkthrough, showWalkthrough, isVisible, isLoading]);

  // Auto-show walkthrough with debouncing
  useEffect(() => {
    if (autoShow && walkthroughId && !autoShowAttempted.current) {
      // Clear any existing timeout
      if (autoShowTimeoutRef.current) {
        clearTimeout(autoShowTimeoutRef.current);
      }
      
      // Debounce the auto-show by 500ms to prevent rapid calls
      autoShowTimeoutRef.current = setTimeout(debouncedAutoShow, 500);
    }

    return () => {
      if (autoShowTimeoutRef.current) {
        clearTimeout(autoShowTimeoutRef.current);
      }
    };
  }, [autoShow, walkthroughId, debouncedAutoShow]);

  // Handle step changes
  const handleStepChange = (step: number) => {
    // Update the context's current step
    setStep(step);
    
    // This can be used to trigger screen-specific actions
    if (currentWalkthrough?.steps[step]?.action) {
      currentWalkthrough.steps[step].action?.();
    }
  };

  // Handle walkthrough completion
  const handleComplete = async () => {
    await completeWalkthrough(userId);
  };

  // Handle walkthrough skip
  const handleSkip = async () => {
    await skipWalkthrough(userId);
  };

  // Don't render if loading or not visible
  if (isLoading || !isVisible || !currentWalkthrough) {
    return null;
  }

  return (
    <Walkthrough
      visible={isVisible}
      steps={currentWalkthrough.steps}
      currentStep={currentStep}
      onComplete={handleComplete}
      onSkip={handleSkip}
      onStepChange={handleStepChange}
    />
  );
};

export default WalkthroughManager;
