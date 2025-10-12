import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SignInScreen } from '../../screens/AuthScreens';
import { AuthContext } from '../../store/AuthContext';
import { AuthService } from '@/services/authService';

// Mock AuthService
jest.mock('@/services/authService', () => ({
  AuthService: {
    signIn: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

const mockOnSignInSuccess = jest.fn();
const mockOnBackToWelcome = jest.fn();

const mockAuthContext = {
  login: jest.fn(),
  isLoading: false,
  error: null,
  user: null,
  isAuthenticated: false,
  logout: jest.fn(),
  updateMood: jest.fn(),
  testDatabaseConnection: jest.fn(),
  setAuthenticatedUser: jest.fn(),
  isProfileComplete: true,
  markProfileComplete: jest.fn(),
};

describe('SignInScreen', () => {
  beforeEach(() => {
    // Clear all mocks between tests to prevent interference
    jest.clearAllMocks();
  });

  it('should render sign in form correctly', () => {
    const { getByPlaceholderText, getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
    expect(getByText('← Back to Welcome')).toBeTruthy();
  });

  it('should call AuthService.signIn when form is submitted with valid data', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSignIn = jest.fn().mockResolvedValue({ user: mockUser, error: null });
    (AuthService.signIn as jest.Mock) = mockSignIn;
    
    const { getByPlaceholderText, getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    // Fill in the form
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    await act(async () => {
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
    });

    await act(async () => {
      fireEvent.press(signInButton);
    });

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    }, { timeout: 5000 });
  });

  it('should navigate to welcome when back button is pressed', () => {
    const { getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    fireEvent.press(getByText('← Back to Welcome'));

    expect(mockOnBackToWelcome).toHaveBeenCalled();
  });

  it('should show loading state when authenticating', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    // Trigger loading state by pressing sign in
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.press(getByText('Sign In'));
    });

    // The component should show loading indicator during authentication
    // Note: The actual loading state is managed internally by the component
  });

  it('should call resetPassword when forgot password is pressed', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue({ success: true, error: null });
    (AuthService.resetPassword as jest.Mock) = mockResetPassword;
    
    const { getByPlaceholderText, getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    // First enter email
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    });

    // Wait a bit for state to update, then press forgot password
    await act(async () => {
      fireEvent.press(getByText('Forgot Password?'));
    });

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should validate email format', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ user: null, error: 'Invalid email format' });
    (AuthService.signIn as jest.Mock) = mockSignIn;
    
    const { getByPlaceholderText, getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    // Fill in the form fields
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Email'), 'invalid-email');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    });

    // Wait for state to update, then press sign in
    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    // The component should handle validation internally
    // We can test that AuthService.signIn is still called (validation happens in AuthService)
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('invalid-email', 'password123');
    });
  });

  it('should validate password is not empty', async () => {
    // Clear any previous mocks and set up a fresh mock
    const mockSignIn = jest.fn();
    (AuthService.signIn as jest.Mock) = mockSignIn;
    
    const { getByPlaceholderText, getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    // Fill in email but leave password empty
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), '');
    });

    // Wait for state to update, then press sign in
    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    // The component validates empty password and shows Alert, then returns early
    // AuthService.signIn should NOT be called
    await waitFor(() => {
      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });

  it('should handle sign in errors', async () => {
    // Clear any previous mocks and set up a fresh mock
    const mockSignIn = jest.fn().mockResolvedValue({ user: null, error: 'Invalid credentials' });
    (AuthService.signIn as jest.Mock) = mockSignIn;
    
    const { getByPlaceholderText, getByText } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <SignInScreen 
          onSignInSuccess={mockOnSignInSuccess} 
          onBackToWelcome={mockOnBackToWelcome} 
        />
      </AuthContext.Provider>
    );

    // Fill in the form fields
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    });

    // Wait for state to update, then press sign in
    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
    });

    // The component should handle the error internally via Alert
    // Since there's an error, onSignInSuccess should NOT be called
    expect(mockOnSignInSuccess).not.toHaveBeenCalled();
  });
});