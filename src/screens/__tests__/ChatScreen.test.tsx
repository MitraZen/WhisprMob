import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { ChatScreen } from '../../screens/ChatScreen';
import { ThemeProvider } from '../../store/ThemeContext';
import { CachedBuddiesService } from '../../services/cachedBuddiesService';
import { notificationService } from '../../services/notificationService';

// Mock dependencies
jest.mock('../../services/cachedBuddiesService', () => ({
  CachedBuddiesService: {
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markMessagesAsRead: jest.fn(),
    clearBuddyChat: jest.fn(),
  },
}));

jest.mock('../../services/notificationService', () => ({
  notificationService: {
    showMessageNotification: jest.fn(),
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

describe('Chat Message Functionality', () => {
  const mockBuddy = {
    id: 'buddy-123',
    name: 'John Doe',
    initials: 'JD',
    buddyUserId: 'user-456',
    isOnline: true,
    unreadCount: 0,
  };

  const mockUser = {
    id: 'user-123',
    name: 'Current User',
    initials: 'CU',
  };

  const mockMessages = [
    {
      id: 'msg-1',
      buddyId: 'buddy-123',
      senderId: 'user-456',
      receiverId: 'user-123',
      content: 'Hello there!',
      messageType: 'text',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      isRead: true,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'msg-2',
      buddyId: 'buddy-123',
      senderId: 'user-123',
      receiverId: 'user-456',
      content: 'Hi John!',
      messageType: 'text',
      timestamp: new Date('2024-01-01T10:01:00Z'),
      isRead: true,
      createdAt: new Date('2024-01-01T10:01:00Z'),
      updatedAt: new Date('2024-01-01T10:01:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful service responses
    jest.mocked(CachedBuddiesService.getMessages).mockResolvedValue(mockMessages);
    jest.mocked(CachedBuddiesService.sendMessage).mockResolvedValue('new-msg-id');
    jest.mocked(CachedBuddiesService.markMessagesAsRead).mockResolvedValue();
    jest.mocked(CachedBuddiesService.clearBuddyChat).mockResolvedValue();
  });

  describe('Message Loading', () => {
    it('should load messages when component mounts', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalledWith(
          mockBuddy.id,
          mockUser.id
        );
      });
    });

    it('should handle message loading errors gracefully', async () => {
      jest.mocked(CachedBuddiesService.getMessages).mockRejectedValue(
        new Error('Failed to load messages')
      );

      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      // Component should still render despite error
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should reload messages when buddy changes', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { rerender } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalledTimes(1);
      });

      // Change buddy
      const newBuddy = { ...mockBuddy, id: 'buddy-456' };
      
      rerender(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={newBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalledTimes(2);
        expect(CachedBuddiesService.getMessages).toHaveBeenLastCalledWith(
          newBuddy.id,
          mockUser.id
        );
      });
    });
  });

  describe('Message Sending', () => {
    it('should send message successfully', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByPlaceholderText, getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(messageInput, 'Hello World!');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(CachedBuddiesService.sendMessage).toHaveBeenCalledWith(
          mockBuddy.id,
          'Hello World!',
          'text',
          mockUser.id
        );
      });
    });

    it('should not send empty messages', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByPlaceholderText, getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(messageInput, '   '); // Only whitespace
      fireEvent.press(sendButton);

      expect(CachedBuddiesService.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle message sending errors', async () => {
      jest.mocked(CachedBuddiesService.sendMessage).mockRejectedValue(
        new Error('Failed to send message')
      );

      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByPlaceholderText, getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(messageInput, 'Hello World!');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(CachedBuddiesService.sendMessage).toHaveBeenCalled();
      });

      // Should restore message content on error
      expect(messageInput.props.value).toBe('Hello World!');
    });

    it('should clear input after successful message send', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByPlaceholderText, getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(messageInput, 'Hello World!');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(CachedBuddiesService.sendMessage).toHaveBeenCalled();
      });

      // Input should be cleared after successful send
      expect(messageInput.props.value).toBe('');
    });

    it('should disable send button while sending', async () => {
      jest.mocked(CachedBuddiesService.sendMessage).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('msg-id'), 100))
      );

      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByPlaceholderText, getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(messageInput, 'Hello World!');
      fireEvent.press(sendButton);

      // Button should be disabled while sending
      expect(sendButton.props.disabled).toBe(true);
    });
  });

  describe('Message Marking as Read', () => {
    it('should mark messages as read when chat screen opens', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.markMessagesAsRead).toHaveBeenCalledWith(
          mockBuddy.id,
          mockUser.id
        );
      });

      expect(mockOnMessagesRead).toHaveBeenCalled();
    });

    it('should handle mark as read errors gracefully', async () => {
      jest.mocked(CachedBuddiesService.markMessagesAsRead).mockRejectedValue(
        new Error('Failed to mark as read')
      );

      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.markMessagesAsRead).toHaveBeenCalled();
      });

      // Component should still render despite error
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Message Refresh', () => {
    it('should refresh messages on pull to refresh', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalledTimes(1);
      });

      const scrollView = getByTestId('messages-scroll-view');
      fireEvent(scrollView, 'refreshControl');

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle refresh errors gracefully', async () => {
      jest.mocked(CachedBuddiesService.getMessages)
        .mockResolvedValueOnce(mockMessages)
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalledTimes(1);
      });

      const scrollView = getByTestId('messages-scroll-view');
      fireEvent(scrollView, 'refreshControl');

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalledTimes(2);
      });

      // Component should still render despite refresh error
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Message Display', () => {
    it('should display messages correctly', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByText } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      // Should display message content
      expect(getByText('Hello there!')).toBeTruthy();
      expect(getByText('Hi John!')).toBeTruthy();
    });

    it('should handle empty message list', async () => {
      jest.mocked(CachedBuddiesService.getMessages).mockResolvedValue([]);

      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByText } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      // Should show empty state message
      expect(getByText('No messages yet')).toBeTruthy();
    });

    it('should format timestamps correctly', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByText } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      // Should display formatted timestamps
      expect(getByText('10:00 AM')).toBeTruthy();
      expect(getByText('10:01 AM')).toBeTruthy();
    });
  });

  describe('Chat Navigation', () => {
    it('should navigate back when back button is pressed', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockOnGoBack).toHaveBeenCalled();
    });

    it('should navigate to profile when profile button is pressed', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const profileButton = getByTestId('profile-button');
      fireEvent.press(profileButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('profile', {
        userId: mockBuddy.buddyUserId,
      });
    });
  });

  describe('Performance', () => {
    it('should handle large message lists efficiently', async () => {
      const largeMessageList = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        buddyId: 'buddy-123',
        senderId: i % 2 === 0 ? 'user-456' : 'user-123',
        receiverId: i % 2 === 0 ? 'user-123' : 'user-456',
        content: `Message ${i}`,
        messageType: 'text',
        timestamp: new Date(`2024-01-01T${10 + Math.floor(i / 60)}:${i % 60}:00Z`),
        isRead: true,
        createdAt: new Date(`2024-01-01T${10 + Math.floor(i / 60)}:${i % 60}:00Z`),
        updatedAt: new Date(`2024-01-01T${10 + Math.floor(i / 60)}:${i % 60}:00Z`),
      }));

      jest.mocked(CachedBuddiesService.getMessages).mockResolvedValue(largeMessageList);

      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const startTime = Date.now();

      render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should render large message list within reasonable time
      expect(duration).toBeLessThan(1000);
    });

    it('should handle rapid message sending efficiently', async () => {
      const mockOnNavigate = jest.fn();
      const mockOnGoBack = jest.fn();
      const mockOnMessagesRead = jest.fn();

      const { getByPlaceholderText, getByTestId } = render(
        <ThemeProvider>
          <ChatScreen
            onNavigate={mockOnNavigate}
            buddy={mockBuddy}
            user={mockUser}
            onGoBack={mockOnGoBack}
            onMessagesRead={mockOnMessagesRead}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(CachedBuddiesService.getMessages).toHaveBeenCalled();
      });

      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      const startTime = Date.now();

      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.changeText(messageInput, `Message ${i}`);
        fireEvent.press(sendButton);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle rapid sending efficiently
      expect(duration).toBeLessThan(500);
      expect(CachedBuddiesService.sendMessage).toHaveBeenCalledTimes(5);
    });
  });
});
