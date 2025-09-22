import axios from 'axios';
import { User, Message, Chat, MoodType } from '@/types';

const API_BASE_URL = 'https://api.gowhispr.site'; // Replace with actual API URL

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // User Management
  async createAnonymousUser(mood: MoodType): Promise<User> {
    try {
      const response = await axios.post(`${this.baseURL}/users/anonymous`, {
        mood,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating anonymous user:', error);
      throw error;
    }
  }

  async updateUserMood(userId: string, mood: MoodType): Promise<User> {
    try {
      const response = await axios.patch(`${this.baseURL}/users/${userId}/mood`, {
        mood,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user mood:', error);
      throw error;
    }
  }

  // Connections
  async getAvailableConnections(userId: string, mood: MoodType): Promise<User[]> {
    try {
      const response = await axios.get(`${this.baseURL}/connections/available`, {
        params: { userId, mood },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching connections:', error);
      throw error;
    }
  }

  async createConnection(userId: string, targetUserId: string): Promise<Chat> {
    try {
      const response = await axios.post(`${this.baseURL}/connections`, {
        userId,
        targetUserId,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  }

  // Messages
  async getChats(userId: string): Promise<Chat[]> {
    try {
      const response = await axios.get(`${this.baseURL}/chats`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  async getMessages(chatId: string): Promise<Message[]> {
    try {
      const response = await axios.get(`${this.baseURL}/chats/${chatId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async sendMessage(chatId: string, message: Partial<Message>): Promise<Message> {
    try {
      const response = await axios.post(`${this.baseURL}/chats/${chatId}/messages`, {
        ...message,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // WebSocket connection for real-time messaging
  connectWebSocket(userId: string): WebSocket {
    const wsUrl = `wss://api.gowhispr.site/ws/${userId}`;
    return new WebSocket(wsUrl);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;











