import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { WalkthroughStep } from '@/components/Walkthrough';
import WalkthroughService, { WalkthroughConfig } from '@/services/walkthroughService';

interface WalkthroughState {
  isVisible: boolean;
  currentWalkthrough: WalkthroughConfig | null;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
}

type WalkthroughAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SHOW_WALKTHROUGH'; payload: WalkthroughConfig }
  | { type: 'HIDE_WALKTHROUGH' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'COMPLETE_WALKTHROUGH' };

interface WalkthroughContextType extends WalkthroughState {
  showWalkthrough: (walkthroughId: string, userId?: string) => Promise<void>;
  hideWalkthrough: () => void;
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: number) => void;
  completeWalkthrough: (userId?: string) => Promise<void>;
  skipWalkthrough: (userId?: string) => Promise<void>;
  getAvailableWalkthroughs: () => WalkthroughConfig[];
  shouldShowWalkthrough: (walkthroughId: string, userId?: string) => Promise<boolean>;
  resetAllWalkthroughs: () => Promise<void>;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

const walkthroughReducer = (state: WalkthroughState, action: WalkthroughAction): WalkthroughState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SHOW_WALKTHROUGH':
      return {
        ...state,
        isVisible: true,
        currentWalkthrough: action.payload,
        currentStep: 0,
        error: null,
      };
    case 'HIDE_WALKTHROUGH':
      return {
        ...state,
        isVisible: false,
        currentWalkthrough: null,
        currentStep: 0,
        error: null,
      };
    case 'NEXT_STEP':
      if (!state.currentWalkthrough) return state;
      const nextStep = Math.min(state.currentStep + 1, state.currentWalkthrough.steps.length - 1);
      return { ...state, currentStep: nextStep };
    case 'PREVIOUS_STEP':
      const prevStep = Math.max(state.currentStep - 1, 0);
      return { ...state, currentStep: prevStep };
    case 'SET_STEP':
      if (!state.currentWalkthrough) return state;
      const newStep = Math.max(0, Math.min(action.payload, state.currentWalkthrough.steps.length - 1));
      return { ...state, currentStep: newStep };
    case 'COMPLETE_WALKTHROUGH':
      return {
        ...state,
        isVisible: false,
        currentWalkthrough: null,
        currentStep: 0,
        error: null,
      };
    default:
      return state;
  }
};

interface WalkthroughProviderProps {
  children: ReactNode;
}

export const WalkthroughProvider: React.FC<WalkthroughProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(walkthroughReducer, {
    isVisible: false,
    currentWalkthrough: null,
    currentStep: 0,
    isLoading: false,
    error: null,
  });

  const showWalkthrough = async (walkthroughId: string, userId?: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const walkthrough = WalkthroughService.getWalkthrough(walkthroughId);
      if (!walkthrough) {
        throw new Error(`Walkthrough with ID '${walkthroughId}' not found`);
      }

      dispatch({ type: 'SHOW_WALKTHROUGH', payload: walkthrough });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const hideWalkthrough = (): void => {
    dispatch({ type: 'HIDE_WALKTHROUGH' });
  };

  const nextStep = (): void => {
    dispatch({ type: 'NEXT_STEP' });
  };

  const previousStep = (): void => {
    dispatch({ type: 'PREVIOUS_STEP' });
  };

  const setStep = (step: number): void => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const completeWalkthrough = async (userId?: string): Promise<void> => {
    try {
      if (state.currentWalkthrough) {
        if (userId) {
          await WalkthroughService.markWalkthroughCompletedForUser(state.currentWalkthrough.id, userId);
        } else {
          await WalkthroughService.markWalkthroughCompleted(state.currentWalkthrough.id);
        }
      }
      dispatch({ type: 'COMPLETE_WALKTHROUGH' });
    } catch (error) {
      console.error('Error completing walkthrough:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to complete walkthrough' });
    }
  };

  const skipWalkthrough = async (userId?: string): Promise<void> => {
    try {
      if (state.currentWalkthrough) {
        if (userId) {
          await WalkthroughService.markWalkthroughCompletedForUser(state.currentWalkthrough.id, userId);
        } else {
          await WalkthroughService.markWalkthroughCompleted(state.currentWalkthrough.id);
        }
      }
      dispatch({ type: 'HIDE_WALKTHROUGH' });
    } catch (error) {
      console.error('Error skipping walkthrough:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to skip walkthrough' });
    }
  };

  const getAvailableWalkthroughs = (): WalkthroughConfig[] => {
    return WalkthroughService.getWalkthroughs();
  };

  const shouldShowWalkthrough = async (walkthroughId: string, userId?: string): Promise<boolean> => {
    return await WalkthroughService.shouldShowWalkthrough(walkthroughId, userId);
  };

  const resetAllWalkthroughs = async (): Promise<void> => {
    await WalkthroughService.resetAllWalkthroughs();
  };

  const contextValue: WalkthroughContextType = {
    ...state,
    showWalkthrough,
    hideWalkthrough,
    nextStep,
    previousStep,
    setStep,
    completeWalkthrough,
    skipWalkthrough,
    getAvailableWalkthroughs,
    shouldShowWalkthrough,
    resetAllWalkthroughs,
  };

  return (
    <WalkthroughContext.Provider value={contextValue}>
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  if (context === undefined) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }
  return context;
};

export default WalkthroughContext;
