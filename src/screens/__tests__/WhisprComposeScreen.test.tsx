import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { WhisprComposeScreen } from '../../screens/WhisprComposeScreen';
import { ThemeProvider } from '../../store/ThemeContext';
import { AdminProvider } from '../../store/AdminContext';
import { AuthProvider } from '../../store/AuthContext';
import { BuddiesService } from '../../services/buddiesService';
import { notificationService } from '../../services/notificationService';

// Mock dependencies
jest.mock('../../services/buddiesService', () => ({
  BuddiesService: {
    sendWhisprNote: jest.fn(),
    getWhisprNotes: jest.fn(),
    listenToNote: jest.fn(),
    rejectNote: jest.fn(),
  },
}));

jest.mock('../../services/notificationService', () => ({
  notificationService: {
    showNoteNotification: jest.fn(),
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('Whispr Notes Functionality', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    initials: 'TU',
  };

  const mockNotes = [
    {
      id: 'note-1',
      senderId: 'user-456',
      content: 'Hello from a stranger!',
      mood: 'happy' as const,
      status: 'active',
      propagationCount: 0,
      isActive: true,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'note-2',
      senderId: 'user-789',
      content: 'Hope you are having a great day!',
      mood: 'excited' as const,
      status: 'active',
      propagationCount: 0,
      isActive: true,
      createdAt: new Date('2024-01-01T11:00:00Z'),
      updatedAt: new Date('2024-01-01T11:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful service responses
    jest.mocked(BuddiesService.sendWhisprNote).mockResolvedValue('new-note-id');
    jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue(mockNotes);
    jest.mocked(BuddiesService.listenToNote).mockResolvedValue({ success: true });
    jest.mocked(BuddiesService.rejectNote).mockResolvedValue({ success: true });
  });

  describe('Note Composition', () => {
    it('should send note successfully with valid input', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(BuddiesService.sendWhisprNote).toHaveBeenCalledWith(
          mockUser.id,
          'Hello world!',
          'happy'
        );
      });

      expect(mockOnNavigate).toHaveBeenCalledWith('notes');
    });

    it('should not send note with empty message', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, '   '); // Only whitespace
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      expect(BuddiesService.sendWhisprNote).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should not send note without mood selection', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const sendButton = getByTestId('send-note-button');

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(sendButton);

      expect(BuddiesService.sendWhisprNote).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should handle note sending errors gracefully', async () => {
      jest.mocked(BuddiesService.sendWhisprNote).mockRejectedValue(
        new Error('Failed to send note')
      );

      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(BuddiesService.sendWhisprNote).toHaveBeenCalled();
      });

      // Should not navigate on error
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should clear form after successful note send', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(BuddiesService.sendWhisprNote).toHaveBeenCalled();
      });

      // Form should be cleared after successful send
      expect(messageInput.props.value).toBe('');
    });

    it('should disable send button while sending', async () => {
      jest.mocked(BuddiesService.sendWhisprNote).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('note-id'), 100))
      );

      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      // Button should be disabled while sending
      expect(sendButton.props.disabled).toBe(true);
    });
  });

  describe('Mood Selection', () => {
    it('should allow mood selection', async () => {
      const mockOnNavigate = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const happyButton = getByTestId('mood-happy');
      const excitedButton = getByTestId('mood-excited');
      const sadButton = getByTestId('mood-sad');

      fireEvent.press(happyButton);
      expect(happyButton.props.style).toContainEqual(expect.objectContaining({
        backgroundColor: expect.any(String),
      }));

      fireEvent.press(excitedButton);
      expect(excitedButton.props.style).toContainEqual(expect.objectContaining({
        backgroundColor: expect.any(String),
      }));

      fireEvent.press(sadButton);
      expect(sadButton.props.style).toContainEqual(expect.objectContaining({
        backgroundColor: expect.any(String),
      }));
    });

    it('should only allow one mood selection at a time', async () => {
      const mockOnNavigate = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const happyButton = getByTestId('mood-happy');
      const excitedButton = getByTestId('mood-excited');

      fireEvent.press(happyButton);
      fireEvent.press(excitedButton);

      // Only the last selected mood should be active
      expect(excitedButton.props.style).toContainEqual(expect.objectContaining({
        backgroundColor: expect.any(String),
      }));
    });
  });

  describe('Note Loading and Display', () => {
    it('should load and display notes correctly', async () => {
      const mockOnNavigate = jest.fn();

      const { getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Should display note content
      expect(getByText('Hello from a stranger!')).toBeTruthy();
      expect(getByText('Hope you are having a great day!')).toBeTruthy();
    });

    it('should handle empty notes list', async () => {
      jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue([]);

      const mockOnNavigate = jest.fn();

      const { getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Should show empty state message
      expect(getByText('No notes yet')).toBeTruthy();
    });

    it('should handle note loading errors gracefully', async () => {
      jest.mocked(BuddiesService.getWhisprNotes).mockRejectedValue(
        new Error('Failed to load notes')
      );

      const mockOnNavigate = jest.fn();

      const { getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Should show error state
      expect(getByText('Failed to load notes')).toBeTruthy();
    });
  });

  describe('Note Actions', () => {
    it('should listen to note successfully', async () => {
      const mockOnNavigate = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const listenButton = getByTestId('listen-note-1');
      fireEvent.press(listenButton);

      await waitFor(() => {
        expect(BuddiesService.listenToNote).toHaveBeenCalledWith('note-1');
      });
    });

    it('should reject note successfully', async () => {
      const mockOnNavigate = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const rejectButton = getByTestId('reject-note-1');
      fireEvent.press(rejectButton);

      await waitFor(() => {
        expect(BuddiesService.rejectNote).toHaveBeenCalledWith('note-1');
      });
    });

    it('should handle note action errors gracefully', async () => {
      jest.mocked(BuddiesService.listenToNote).mockRejectedValue(
        new Error('Failed to listen to note')
      );

      const mockOnNavigate = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const listenButton = getByTestId('listen-note-1');
      fireEvent.press(listenButton);

      await waitFor(() => {
        expect(BuddiesService.listenToNote).toHaveBeenCalled();
      });

      // Should show error message
      expect(getByTestId('error-message')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', async () => {
      const mockOnNavigate = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('notes');
    });

    it('should navigate to notes after successful note send', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(BuddiesService.sendWhisprNote).toHaveBeenCalled();
      });

      expect(mockOnNavigate).toHaveBeenCalledWith('notes');
    });
  });

  describe('User Authentication', () => {
    it('should handle unauthenticated user gracefully', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={null}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      expect(BuddiesService.sendWhisprNote).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should handle user without ID gracefully', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={{ name: 'Test User' }}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      fireEvent.changeText(messageInput, 'Hello world!');
      fireEvent.press(moodButton);
      fireEvent.press(sendButton);

      expect(BuddiesService.sendWhisprNote).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle large notes list efficiently', async () => {
      const largeNotesList = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        senderId: `user-${i}`,
        content: `Note content ${i}`,
        mood: ['happy', 'excited', 'sad', 'calm'][i % 4],
        status: 'active',
        createdAt: new Date(`2024-01-01T${10 + Math.floor(i / 60)}:${i % 60}:00Z`),
      }));

      jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue(largeNotesList);

      const mockOnNavigate = jest.fn();

      const startTime = Date.now();

      render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(BuddiesService.getWhisprNotes).toHaveBeenCalled();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should render large notes list within reasonable time
      expect(duration).toBeLessThan(1000);
    });

    it('should handle rapid note sending efficiently', async () => {
      const mockOnNavigate = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      const messageInput = getByPlaceholderText('What\'s on your mind? Share your thoughts with the world...');
      const moodButton = getByText('😊'); // Use the emoji text instead of test ID
      const sendButton = getByText('Send to the World'); // Use the button text instead of test ID

      const startTime = Date.now();

      // Send multiple notes rapidly
      for (let i = 0; i < 3; i++) {
        fireEvent.changeText(messageInput, `Note ${i}`);
        fireEvent.press(moodButton);
        fireEvent.press(sendButton);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle rapid sending efficiently
      expect(duration).toBeLessThan(500);
      expect(BuddiesService.sendWhisprNote).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration with Notification Service', () => {
    it('should trigger notifications when notes are received', async () => {
      const mockOnNavigate = jest.fn();

      render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(BuddiesService.getWhisprNotes).toHaveBeenCalled();
      });

      // Should trigger notifications for new notes
      expect(notificationService.showNoteNotification).toHaveBeenCalledWith(
        'New Whispr Note',
        'Hello from a stranger!'
      );
    });

    it('should handle notification service errors gracefully', async () => {
      jest.mocked(notificationService.showNoteNotification).mockRejectedValue(
        new Error('Notification failed')
      );

      const mockOnNavigate = jest.fn();

      render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <WhisprComposeScreen
                onNavigate={mockOnNavigate}
                user={mockUser}
              />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(BuddiesService.getWhisprNotes).toHaveBeenCalled();
      });

      // Should still render despite notification errors
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });
});
