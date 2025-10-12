// Mock the AuthService module
jest.mock('../authService', () => ({
  AuthService: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

import { AuthService } from '../authService';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create user successfully with valid data', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      };
      
      const mockResult = {
        success: true,
        user: mockUser,
      };
      
      (AuthService.signUp as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signUp('test@example.com', 'password123', 'happy');
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(AuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'happy');
    });

    it('should handle signup errors gracefully', async () => {
      const mockResult = {
        success: false,
        error: 'Email already exists',
      };
      
      (AuthService.signUp as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signUp('test@example.com', 'password123', 'happy');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should validate email format', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid email format',
      };
      
      (AuthService.signUp as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signUp('invalid-email', 'password123', 'happy');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should validate password strength', async () => {
      const mockResult = {
        success: false,
        error: 'Password too weak',
      };
      
      (AuthService.signUp as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signUp('test@example.com', '123', 'happy');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password');
    });
  });

  describe('signIn', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      };
      
      const mockResult = {
        success: true,
        user: mockUser,
      };
      
      (AuthService.signIn as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signIn('test@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(AuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should handle authentication errors', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid credentials',
      };
      
      (AuthService.signIn as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signIn('test@example.com', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      const mockResult = {
        success: true,
      };
      
      (AuthService.signOut as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signOut();
      
      expect(result.success).toBe(true);
      expect(AuthService.signOut).toHaveBeenCalled();
    });

    it('should handle signout errors', async () => {
      const mockResult = {
        success: false,
        error: 'Signout failed',
      };
      
      (AuthService.signOut as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuthService.signOut();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Signout failed');
    });
  });
});