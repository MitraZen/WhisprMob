import { supabase } from '@/config/supabase';

/**
 * Test WebSocket connection to Supabase Realtime
 * This utility helps verify that WebSocket connections work properly
 * before enabling the full real-time service
 */
export class WebSocketTest {
  private static instance: WebSocketTest;
  private testChannel: any = null;
  private isConnected = false;
  private connectionPromise: Promise<boolean> | null = null;

  static getInstance(): WebSocketTest {
    if (!WebSocketTest.instance) {
      WebSocketTest.instance = new WebSocketTest();
    }
    return WebSocketTest.instance;
  }

  /**
   * Test basic WebSocket connectivity
   */
  async testConnection(): Promise<boolean> {
    console.log('🧪 Testing WebSocket connection...');
    
    return new Promise((resolve, reject) => {
      try {
        // Create a test channel
        this.testChannel = supabase.channel('websocket-test', {
          config: {
            presence: { key: 'test-key' }
          }
        });

        // Set up event handlers
        this.testChannel
          .on('presence', { event: 'sync' }, () => {
            console.log('✅ WebSocket connection test successful');
            this.isConnected = true;
            this.cleanup();
            resolve(true);
          })
          .on('presence', { event: 'join' }, () => {
            console.log('🔌 WebSocket joined successfully');
          })
          .on('presence', { event: 'leave' }, () => {
            console.log('🔌 WebSocket left');
          })
          .subscribe((status: string) => {
            console.log('📡 WebSocket status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ WebSocket subscribed successfully');
              // Trigger a presence sync to test the connection
              this.testChannel.track({ 
                user: 'test-user', 
                online_at: new Date().toISOString() 
              });
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ WebSocket channel error');
              this.isConnected = false;
              this.cleanup();
              reject(new Error('WebSocket channel error'));
            } else if (status === 'TIMED_OUT') {
              console.error('❌ WebSocket connection timed out');
              this.isConnected = false;
              this.cleanup();
              reject(new Error('WebSocket connection timed out'));
            } else if (status === 'CLOSED') {
              console.log('🔌 WebSocket connection closed');
              this.isConnected = false;
            }
          });

        // Set a timeout for the test
        setTimeout(() => {
          if (!this.isConnected) {
            console.error('❌ WebSocket test timeout');
            this.cleanup();
            reject(new Error('WebSocket test timeout'));
          }
        }, 5000); // Reduced from 15 seconds to 5 seconds

      } catch (error) {
        console.error('❌ WebSocket test error:', error);
        this.cleanup();
        reject(error);
      }
    });
  }

  /**
   * Test real-time database changes
   */
  async testDatabaseRealtime(): Promise<boolean> {
    console.log('🧪 Testing database real-time functionality...');
    
    return new Promise((resolve, reject) => {
      try {
        const testChannel = supabase.channel('db-test');
        
        testChannel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'whisprs'
            },
            (payload: any) => {
              console.log('✅ Database real-time test successful:', payload);
              testChannel.unsubscribe();
              resolve(true);
            }
          )
          .subscribe((status: string) => {
            console.log('📡 Database real-time status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Database real-time subscribed');
              // The subscription is ready, resolve after a short delay
              setTimeout(() => {
                testChannel.unsubscribe();
                resolve(true);
              }, 2000);
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Database real-time error');
              testChannel.unsubscribe();
              reject(new Error('Database real-time error'));
            }
          });

        // Set a timeout
        setTimeout(() => {
          testChannel.unsubscribe();
          reject(new Error('Database real-time test timeout'));
        }, 15000);

      } catch (error) {
        console.error('❌ Database real-time test error:', error);
        reject(error);
      }
    });
  }

  /**
   * Clean up test resources
   */
  private cleanup(): void {
    if (this.testChannel) {
      this.testChannel.unsubscribe();
      this.testChannel = null;
    }
  }

  /**
   * Run comprehensive WebSocket tests
   */
  async runAllTests(): Promise<{ connection: boolean; database: boolean }> {
    console.log('🚀 Running comprehensive WebSocket tests...');
    
    const results = {
      connection: false,
      database: false
    };

    try {
      // Test 1: Basic WebSocket connection
      console.log('📡 Test 1: Basic WebSocket connection');
      results.connection = await this.testConnection();
      console.log('✅ Basic connection test:', results.connection ? 'PASS' : 'FAIL');
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 2: Database real-time functionality
      console.log('📡 Test 2: Database real-time functionality');
      results.database = await this.testDatabaseRealtime();
      console.log('✅ Database real-time test:', results.database ? 'PASS' : 'FAIL');
      
    } catch (error) {
      console.error('❌ WebSocket tests failed:', error);
    }

    console.log('📊 Test Results:', results);
    return results;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

/**
 * Convenience function to run WebSocket tests
 */
export const testWebSocketConnection = async (): Promise<boolean> => {
  const tester = WebSocketTest.getInstance();
  const results = await tester.runAllTests();
  return results.connection && results.database;
};

/**
 * Quick connection test
 */
export const quickWebSocketTest = async (): Promise<boolean> => {
  const tester = WebSocketTest.getInstance();
  return await tester.testConnection();
};
