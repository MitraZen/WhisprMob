// Whispr Notes Unified Trigger - Client Implementation Example
// This file shows how to implement client-side subscriptions for the new unified trigger

import { supabase } from '@/config/supabase';

export class WhisprNotesUnifiedService {
  private static subscriptions: Map<string, any> = new Map();

  /**
   * Subscribe to real-time note updates (for nearby notes feed)
   */
  static subscribeToNoteUpdates(
    userId: string, 
    onNoteUpdate: (note: any) => void
  ): void {
    console.log('📝 Subscribing to note updates for user:', userId);
    
    const subscription = supabase
      .channel('note_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'whispr_notes',
          filter: `status=eq.active`
        }, 
        (payload) => {
          console.log('📝 Note update received:', payload);
          
          if (payload.new?.type === 'note') {
            onNoteUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Note updates subscription status:', status);
      });

    this.subscriptions.set(`note_updates_${userId}`, subscription);
  }

  /**
   * Subscribe to note notifications (for UI notifications)
   */
  static subscribeToNoteNotifications(
    userId: string, 
    onNotification: (notification: any) => void
  ): void {
    console.log('🔔 Subscribing to note notifications for user:', userId);
    
    const subscription = supabase
      .channel('note_notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'whispr_notes',
          filter: `sender_id=neq.${userId}` // Not from current user
        }, 
        (payload) => {
          console.log('🔔 Notification received:', payload);
          
          if (payload.new?.type === 'notification') {
            onNotification(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Note notifications subscription status:', status);
      });

    this.subscriptions.set(`note_notifications_${userId}`, subscription);
  }

  /**
   * Subscribe to both note updates and notifications (COMPREHENSIVE)
   */
  static subscribeToAllNoteEvents(
    userId: string, 
    onNoteUpdate: (note: any) => void,
    onNotification: (notification: any) => void
  ): void {
    this.subscribeToNoteUpdates(userId, onNoteUpdate);
    this.subscribeToNoteNotifications(userId, onNotification);
  }

  /**
   * Unsubscribe from note events
   */
  static unsubscribeFromNoteEvents(userId: string): void {
    console.log('🔕 Unsubscribing from note events for user:', userId);
    
    const updateKey = `note_updates_${userId}`;
    const notificationKey = `note_notifications_${userId}`;
    
    if (this.subscriptions.has(updateKey)) {
      supabase.removeChannel(this.subscriptions.get(updateKey));
      this.subscriptions.delete(updateKey);
    }
    
    if (this.subscriptions.has(notificationKey)) {
      supabase.removeChannel(this.subscriptions.get(notificationKey));
      this.subscriptions.delete(notificationKey);
    }
  }

  /**
   * Create a new note (triggers unified notification)
   */
  static async createNote(
    senderId: string,
    content: string,
    mood: string = 'happy'
  ): Promise<any> {
    try {
      console.log('📝 Creating note:', { senderId, content, mood });
      
      const { data, error } = await supabase
        .from('whispr_notes')
        .insert({
          sender_id: senderId,
          content,
          mood,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Note created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating note:', error);
      throw error;
    }
  }

  /**
   * Update note status (triggers status change notification)
   */
  static async updateNoteStatus(
    noteId: string,
    status: 'active' | 'listened' | 'rejected' | 'expired'
  ): Promise<any> {
    try {
      console.log('🔄 Updating note status:', { noteId, status });
      
      const { data, error } = await supabase
        .from('whispr_notes')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Note status updated successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error updating note status:', error);
      throw error;
    }
  }

  /**
   * Test function to verify unified trigger
   */
  static async testUnifiedTrigger(
    senderId: string,
    content: string = 'Test note for unified trigger!',
    mood: string = 'happy'
  ): Promise<any> {
    try {
      console.log('🧪 Testing unified trigger...');
      
      const startTime = Date.now();
      
      // Create note (this should trigger both real-time update and notification)
      const note = await this.createNote(senderId, content, mood);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`⚡ Unified trigger executed in ${executionTime}ms`);
      
      return {
        success: true,
        note,
        executionTime,
        message: 'Unified trigger test completed successfully'
      };
    } catch (error) {
      console.error('❌ Unified trigger test failed:', error);
      throw error;
    }
  }

  /**
   * Get subscription status
   */
  static getSubscriptionStatus(userId: string): { 
    updates: boolean; 
    notifications: boolean 
  } {
    return {
      updates: this.subscriptions.has(`note_updates_${userId}`),
      notifications: this.subscriptions.has(`note_notifications_${userId}`)
    };
  }
}

// Example usage in a React component:
/*
import React, { useEffect, useState } from 'react';
import { WhisprNotesUnifiedService } from './WhisprNotesUnifiedService';

export const WhisprNotesTestComponent = ({ userId }) => {
  const [notes, setNotes] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to both note updates and notifications
    WhisprNotesUnifiedService.subscribeToAllNoteEvents(
      userId,
      (note) => {
        console.log('📝 Note update received:', note);
        setNotes(prev => [note, ...prev]);
      },
      (notification) => {
        console.log('🔔 Notification received:', notification);
        setNotifications(prev => [notification, ...prev]);
        
        // Show UI notification
        showNotification({
          title: 'New Whispr Note',
          body: notification.content_preview,
          mood: notification.mood,
          sender: notification.sender_profile?.display_name
        });
      }
    );

    // Cleanup on unmount
    return () => {
      WhisprNotesUnifiedService.unsubscribeFromNoteEvents(userId);
    };
  }, [userId]);

  const testUnifiedTrigger = async () => {
    try {
      const result = await WhisprNotesUnifiedService.testUnifiedTrigger(
        userId,
        'Test note for unified trigger!',
        'happy'
      );
      console.log('✅ Test result:', result);
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };

  return (
    <div>
      <h2>Whispr Notes Unified Trigger Test</h2>
      <button onClick={testUnifiedTrigger}>
        Test Unified Trigger
      </button>
      
      <div>
        <h3>Notes ({notes.length})</h3>
        {notes.map(note => (
          <div key={note.note_id}>
            <p>{note.content_preview}</p>
            <small>Mood: {note.mood}</small>
          </div>
        ))}
      </div>
      
      <div>
        <h3>Notifications ({notifications.length})</h3>
        {notifications.map(notification => (
          <div key={notification.note_id}>
            <p>{notification.content_preview}</p>
            <small>From: {notification.sender_profile?.display_name}</small>
          </div>
        ))}
      </div>
    </div>
  );
};
*/
