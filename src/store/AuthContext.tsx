import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User } from '@/types';
import { StorageService, generateAnonymousId } from '@/utils/helpers';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';

interface AuthContextType extends AuthState {
  login: (mood: string) => Promise<void>;
  logout: () => Promise<void>;
  updateMood: (mood: string) => Promise<void>;
  testDatabaseConnection: () => Promise<boolean>;
  setAuthenticatedUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_MOOD'; payload: string };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      };
    case 'UPDATE_MOOD':
      return {
        ...state,
        user: state.user ? { ...state.user, mood: action.payload as any } : null,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('AuthContext - Checking auth status...');
      
      // First check local storage
      const storedUser = await StorageService.getItem<User>('user');
      console.log('AuthContext - Stored user found:', !!storedUser);
      
      if (storedUser) {
               // Verify user still exists in database
               const dbUser = await FlexibleDatabaseService.getUserById(storedUser.id);
        if (dbUser) {
          // Update user's online status
          await FlexibleDatabaseService.updateUserOnlineStatus(storedUser.id, true);
          dispatch({ type: 'LOGIN_SUCCESS', payload: dbUser });
        } else {
          // User no longer exists in database, clear local storage
          await StorageService.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('AuthContext - No stored user, setting loading to false');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (mood: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const anonymousId = generateAnonymousId();
      
             // Create user in Supabase database
             const newUser = await FlexibleDatabaseService.createUser({
               anonymousId,
               mood: mood as any,
             });

      if (!newUser) {
        throw new Error('Failed to create user in database');
      }

      // Store user locally
      await StorageService.setItem('user', newUser);
      dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
      
      console.log('User logged in successfully with ID:', newUser.id);
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // Allow email/password auth flow to set the authenticated user
  const setAuthenticatedUser = async (user: User) => {
    try {
      await StorageService.setItem('user', user);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      console.error('setAuthenticatedUser error:', error);
    }
  };

  const logout = async () => {
    try {
             if (state.user) {
               // Update user's online status to false
               await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, false);
             }
      
      // Clear local storage
      await StorageService.removeItem('user');
      dispatch({ type: 'LOGOUT' });
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateMood = async (mood: string) => {
    try {
             if (state.user) {
               // Update mood in database
               const success = await FlexibleDatabaseService.updateUserMood(state.user.id, mood as any);
               
               if (success) {
                 // Update local user data
                 const updatedUser = { ...state.user, mood: mood as any };
                 await StorageService.setItem('user', updatedUser);
                 dispatch({ type: 'UPDATE_MOOD', payload: mood });
               }
             }
    } catch (error) {
      console.error('Update mood error:', error);
    }
  };

         const testDatabaseConnection = async (): Promise<boolean> => {
           try {
             return await FlexibleDatabaseService.testConnection();
           } catch (error) {
             console.error('Database connection test error:', error);
             return false;
           }
         };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateMood,
    testDatabaseConnection,
    setAuthenticatedUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


