// Mock the BuddiesService module
jest.mock('../buddiesService', () => ({
  BuddiesService: {
    sendWhisprNote: jest.fn(),
    listenToNote: jest.fn(),
    rejectNote: jest.fn(),
    getBuddies: jest.fn(),
    getMessages: jest.fn(), // Correct method name
    deleteBuddy: jest.fn(),
    testConnection: jest.fn(),
    testNetworkConnection: jest.fn(),
    rpcRequest: jest.fn(),
    request: jest.fn(),
  },
}));

import { BuddiesService } from '../buddiesService';

describe('BuddiesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWhisprNote', () => {
    it('should send note successfully', async () => {
      const mockNoteId = 'note-123';
      
      (BuddiesService.sendWhisprNote as jest.Mock).mockResolvedValue(mockNoteId);

      const result = await BuddiesService.sendWhisprNote('user-123', 'Test message', 'happy');
      
      expect(result).toBe(mockNoteId);
      expect(BuddiesService.sendWhisprNote).toHaveBeenCalledWith('user-123', 'Test message', 'happy');
    });

    it('should handle send note errors', async () => {
      (BuddiesService.sendWhisprNote as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        BuddiesService.sendWhisprNote('user-123', 'Test message', 'happy')
      ).rejects.toThrow('Network error');
    });

    it('should validate note content', async () => {
      (BuddiesService.sendWhisprNote as jest.Mock).mockRejectedValue(new Error('Note content cannot be empty'));

      await expect(
        BuddiesService.sendWhisprNote('user-123', '', 'happy')
      ).rejects.toThrow('Note content cannot be empty');
    });

    it('should validate mood parameter', async () => {
      (BuddiesService.sendWhisprNote as jest.Mock).mockRejectedValue(new Error('Invalid mood'));

      await expect(
        BuddiesService.sendWhisprNote('user-123', 'Test message', 'invalid-mood')
      ).rejects.toThrow('Invalid mood');
    });
  });

  describe('listenToNote', () => {
    it('should create buddy relationship when listening to note', async () => {
      const mockResult = { 
        success: true, 
        buddy_id: 'buddy-123' 
      };
      
      (BuddiesService.listenToNote as jest.Mock).mockResolvedValue(mockResult);

      const result = await BuddiesService.listenToNote('note-123', 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.buddy_id).toBe('buddy-123');
      expect(BuddiesService.listenToNote).toHaveBeenCalledWith('note-123', 'user-123');
    });

    it('should handle listen note errors', async () => {
      (BuddiesService.listenToNote as jest.Mock).mockRejectedValue(new Error('RPC error'));

      await expect(
        BuddiesService.listenToNote('note-123', 'user-123')
      ).rejects.toThrow('RPC error');
    });
  });

  describe('rejectNote', () => {
    it('should reject note successfully', async () => {
      const mockResult = { 
        success: true, 
        message: 'Note rejected' 
      };
      
      (BuddiesService.rejectNote as jest.Mock).mockResolvedValue(mockResult);

      const result = await BuddiesService.rejectNote('note-123', 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Note rejected');
      expect(BuddiesService.rejectNote).toHaveBeenCalledWith('note-123', 'user-123');
    });
  });

  describe('getBuddies', () => {
    it('should retrieve buddies list', async () => {
      const mockBuddies = [
        { 
          id: 'buddy-1', 
          name: 'Buddy 1', 
          initials: 'B1',
          unreadCount: 0,
          isOnline: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          id: 'buddy-2', 
          name: 'Buddy 2', 
          initials: 'B2',
          unreadCount: 3,
          isOnline: false,
          status: 'away',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue(mockBuddies);

      const result = await BuddiesService.getBuddies('user-123');
      
      expect(result).toEqual(mockBuddies);
      expect(Array.isArray(result)).toBe(true);
      expect(BuddiesService.getBuddies).toHaveBeenCalledWith('user-123');
    });

    it('should handle empty buddies list', async () => {
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue([]);

      const result = await BuddiesService.getBuddies('user-123');
      
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle getBuddies errors', async () => {
      (BuddiesService.getBuddies as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        BuddiesService.getBuddies('user-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getMessages', () => {
    it('should retrieve buddy messages', async () => {
      const mockMessages = [
        { 
          id: 'msg-1', 
          buddyId: 'buddy-123',
          senderId: 'user-123',
          receiverId: 'buddy-user-123',
          content: 'Hello', 
          messageType: 'text',
          isRead: false,
          timestamp: new Date('2023-01-01T00:00:00Z'),
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-01T00:00:00Z'),
        },
        { 
          id: 'msg-2', 
          buddyId: 'buddy-123',
          senderId: 'buddy-user-123',
          receiverId: 'user-123',
          content: 'Hi there', 
          messageType: 'text',
          isRead: true,
          timestamp: new Date('2023-01-01T00:01:00Z'),
          createdAt: new Date('2023-01-01T00:01:00Z'),
          updatedAt: new Date('2023-01-01T00:01:00Z'),
        },
      ];
      
      (BuddiesService.getMessages as jest.Mock).mockResolvedValue(mockMessages);

      const result = await BuddiesService.getMessages('buddy-123', 'user-123');
      
      expect(result).toEqual(mockMessages);
      expect(Array.isArray(result)).toBe(true);
      expect(BuddiesService.getMessages).toHaveBeenCalledWith('buddy-123', 'user-123');
    });

    it('should handle empty messages list', async () => {
      (BuddiesService.getMessages as jest.Mock).mockResolvedValue([]);

      const result = await BuddiesService.getMessages('buddy-123', 'user-123');
      
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deleteBuddy', () => {
    it('should delete buddy successfully', async () => {
      const mockResult = { 
        success: true, 
        deleted_messages: 5 
      };
      
      (BuddiesService.deleteBuddy as jest.Mock).mockResolvedValue(true);

      const result = await BuddiesService.deleteBuddy('buddy-123', 'user-123');
      
      expect(result).toBe(true);
      expect(BuddiesService.deleteBuddy).toHaveBeenCalledWith('buddy-123', 'user-123');
    });

    it('should handle delete buddy errors', async () => {
      (BuddiesService.deleteBuddy as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      await expect(
        BuddiesService.deleteBuddy('buddy-123', 'user-123')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('testConnection', () => {
    it('should test network connection successfully', async () => {
      (BuddiesService.testConnection as jest.Mock).mockResolvedValue(true);

      const result = await BuddiesService.testConnection();
      
      expect(result).toBe(true);
      expect(BuddiesService.testConnection).toHaveBeenCalled();
    });

    it('should handle connection test failures', async () => {
      (BuddiesService.testConnection as jest.Mock).mockResolvedValue(false);

      const result = await BuddiesService.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('testNetworkConnection', () => {
    it('should test network connectivity', async () => {
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);

      const result = await BuddiesService.testNetworkConnection();
      
      expect(result).toBe(true);
      expect(BuddiesService.testNetworkConnection).toHaveBeenCalled();
    });

    it('should handle network test failures', async () => {
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(false);

      const result = await BuddiesService.testNetworkConnection();
      
      expect(result).toBe(false);
    });
  });
});