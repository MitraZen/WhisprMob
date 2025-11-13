# 📱 Local Database Implementation Plan
## WhatsApp/Telegram-Style Offline-First Architecture

---

## 🎯 **Executive Summary**

This plan outlines the implementation of a **local SQLite database** for the Whispr mobile app, enabling offline-first functionality similar to WhatsApp, Telegram, and other modern chat applications. The solution will provide instant message loading, offline message sending, and seamless synchronization with Supabase.

---

## 📊 **Current State Analysis**

### **Current Architecture:**
- ✅ **Backend**: Supabase (PostgreSQL) - Cloud database
- ✅ **Local Storage**: AsyncStorage - Simple key-value storage
- ✅ **Caching**: In-memory caches + AsyncStorage for messages
- ❌ **No Local Database**: No SQLite or structured local storage
- ❌ **No Offline Support**: App requires network for all operations
- ❌ **Slow Initial Load**: Messages fetched from Supabase on every chat open

### **Current Data Flow:**
```
User Action → API Call → Supabase → Response → UI Update
              ↓
         (Network Required)
```

### **Problems with Current Approach:**
1. **No Offline Functionality**: Cannot send/receive messages without internet
2. **Slow Performance**: Every chat open requires network round-trip
3. **Poor UX**: Empty screens while waiting for data
4. **Data Loss Risk**: Messages not persisted locally
5. **Battery Drain**: Constant network requests
6. **Limited Caching**: AsyncStorage has size limitations (~6MB on Android)

---

## 🎯 **Target Architecture (WhatsApp/Telegram Style)**

### **New Data Flow:**
```
User Action → Local SQLite → Instant UI Update
              ↓
         Background Sync → Supabase
              ↓
         Conflict Resolution → Local Update
```

### **Key Principles:**
1. **Offline-First**: All operations work locally first
2. **Instant Loading**: Messages load from local DB instantly
3. **Background Sync**: Sync happens in background, not blocking UI
4. **Conflict Resolution**: Handle sync conflicts intelligently
5. **Incremental Sync**: Only sync changes, not entire database

---

## 🏗️ **Implementation Plan**

### **Phase 1: Database Setup & Schema Design** ⏱️ *Week 1.5* 🔒 **ENCRYPTION MANDATORY**

#### **1.1 Choose SQLite Library with Encryption**
**⚠️ CRITICAL: Database encryption is MANDATORY for chat applications**

**Recommended**: `react-native-quick-sqlite` with encryption support

**Why Encryption is Required:**
- Chat messages are highly sensitive personal data
- GDPR/privacy regulations require encryption at rest
- If device is stolen, unencrypted SQLite DB is easily readable
- Performance impact is minimal (~10-15%)

**Options:**
1. **`@op-engineering/op-sqlite-encrypted`** (Recommended)
   - ✅ Built-in encryption support
   - ✅ Excellent performance
   - ✅ Active maintenance
   - ✅ TypeScript support

2. **`react-native-quick-sqlite` + SQLCipher**
   - ✅ Industry standard encryption
   - ⚠️ Requires additional setup

**Installation:**
```bash
npm install @op-engineering/op-sqlite-encrypted
# OR
npm install react-native-quick-sqlite-encrypted
# For iOS
cd ios && pod install
```

#### **1.1.1 Encryption Key Management**

**File**: `src/services/encryptionKeyService.ts`

```typescript
import * as SecureStore from 'expo-secure-store'; // or react-native-keychain

class EncryptionKeyService {
  private static readonly KEY_NAME = 'db_encryption_key';
  
  /**
   * Generate or retrieve encryption key
   * Key is stored in iOS Keychain / Android Keystore
   */
  static async getEncryptionKey(): Promise<string> {
    try {
      // Try to get existing key
      let key = await SecureStore.getItemAsync(this.KEY_NAME);
      
      if (!key) {
        // Generate new key (32 bytes = 256 bits for AES-256)
        key = this.generateKey();
        await SecureStore.setItemAsync(this.KEY_NAME, key);
      }
      
      return key;
    } catch (error) {
      console.error('Failed to get encryption key:', error);
      throw new Error('Database encryption key unavailable');
    }
  }
  
  /**
   * Generate cryptographically secure random key
   */
  private static generateKey(): string {
    // Use crypto.getRandomValues or similar
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Rotate encryption key (future feature)
   * Requires re-encrypting entire database
   */
  static async rotateKey(): Promise<void> {
    // Advanced: Implement key rotation
    // This requires decrypting and re-encrypting all data
  }
}
```

**Database Initialization with Encryption:**
```typescript
// In localDatabaseService.ts
async initialize(): Promise<void> {
  const encryptionKey = await EncryptionKeyService.getEncryptionKey();
  
  await db.init({
    name: 'whispr.db',
    encryptionKey: encryptionKey,
    location: 'default',
  });
}
```

#### **1.2 Design Local Database Schema**

**Mirror Supabase Schema with Additions:**

```sql
-- Local SQLite Schema

-- 1. Users Table (Cached from user_profiles)
CREATE TABLE local_users (
  id TEXT PRIMARY KEY,
  anonymous_id TEXT UNIQUE,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  mood TEXT,
  is_online INTEGER DEFAULT 0,
  last_seen TEXT,
  created_at TEXT,
  updated_at TEXT,
  synced_at TEXT,  -- Last sync timestamp
  sync_status TEXT DEFAULT 'synced'  -- 'synced', 'pending', 'error'
);

-- 2. Buddies Table (Cached from buddies)
CREATE TABLE local_buddies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  buddy_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  avatar_url TEXT,
  is_pinned INTEGER DEFAULT 0,
  is_online INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  mood TEXT,
  last_message TEXT,
  last_message_time TEXT,
  unread_count INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  synced_at TEXT,
  sync_status TEXT DEFAULT 'synced',
  UNIQUE(user_id, buddy_user_id)
);

-- 3. Messages Table (Cached from buddy_messages)
CREATE TABLE local_messages (
  id TEXT PRIMARY KEY,
  buddy_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  is_read INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  synced_at TEXT,
  sync_status TEXT DEFAULT 'synced',  -- 'synced', 'pending', 'error'
  local_id TEXT,  -- Temporary ID for offline messages
  server_id TEXT,  -- Server ID after sync
  FOREIGN KEY (buddy_id) REFERENCES local_buddies(id)
);

-- 4. Sync Queue Table (For pending operations)
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,  -- 'insert', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON string of the record
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  priority INTEGER DEFAULT 5  -- 1=highest (user actions), 10=lowest (background)
);

-- Priority Levels:
-- 1: User's sent messages (immediate sync)
-- 3: Read status updates
-- 5: Buddy data updates (default)
-- 7: Profile updates
-- 10: Background cleanup operations

-- 5. Sync Metadata Table
CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_local_messages_buddy_id ON local_messages(buddy_id);
CREATE INDEX idx_local_messages_created_at ON local_messages(created_at);
CREATE INDEX idx_local_messages_sync_status ON local_messages(sync_status);
CREATE UNIQUE INDEX idx_messages_id ON local_messages(id);  -- Prevent duplicates
CREATE INDEX idx_sync_queue_priority ON sync_queue(priority, created_at);  -- Priority-based sync
CREATE INDEX idx_sync_queue_operation ON sync_queue(operation_type, table_name);
CREATE INDEX idx_local_buddies_user_id ON local_buddies(user_id);
```

#### **1.3 Database Initialization Service**

**File**: `src/services/localDatabaseService.ts`

**Responsibilities:**
- Initialize SQLite database (with encryption)
- Create tables and indexes
- Handle database migrations
- Provide connection management
- Validate database integrity on startup

**Key Methods:**
```typescript
class LocalDatabaseService {
  // Initialize database (with encryption)
  async initialize(): Promise<void> {
    const encryptionKey = await EncryptionKeyService.getEncryptionKey();
    
    await db.init({
      name: 'whispr.db',
      encryptionKey: encryptionKey,
      location: 'default',
    });
    
    // Run integrity check on startup (fast check)
    const integrity = await databaseMaintenanceService.validateDatabaseIntegrity();
    if (!integrity.isValid) {
      console.warn('⚠️ Database integrity check failed on startup');
      // Handle corruption (recovery or re-migration)
      await databaseMaintenanceService.handleCorruption();
    }
    
    // Create tables and indexes
    await this.createTables();
    await this.createIndexes();
  }
  
  // Execute queries
  async execute(sql: string, params?: any[]): Promise<any>
  
  // Transaction support
  async transaction(callback: Function): Promise<void>
  
  // Migration management
  async migrate(version: number): Promise<void>
  
  // Clear database (for testing or re-migration)
  async clear(): Promise<void>
}
```

---

### **Phase 2: Data Access Layer** ⏱️ *Week 2*

#### **2.1 Repository Pattern Implementation**

Create repositories for each entity:

**File**: `src/repositories/MessageRepository.ts`
```typescript
class MessageRepository {
  // Get messages for a buddy (paginated)
  async getMessages(buddyId: string, limit: number, offset: number): Promise<Message[]>
  
  // Insert message (optimistic) - Uses INSERT OR REPLACE to prevent duplicates
  async insertMessage(message: Message): Promise<string> {
    // Use INSERT OR REPLACE to handle race conditions
    await db.execute(`
      INSERT OR REPLACE INTO local_messages 
      (id, buddy_id, sender_id, receiver_id, content, message_type, is_read, 
       created_at, updated_at, sync_status, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [message.id, message.buddy_id, message.sender_id, message.receiver_id,
        message.content, message.message_type, message.is_read ? 1 : 0,
        message.created_at, message.updated_at, message.sync_status, message.synced_at]);
  }
  
  // Update message sync status
  async updateSyncStatus(messageId: string, status: 'synced' | 'pending' | 'error'): Promise<void>
  
  // Get unsynced messages (ordered by priority)
  async getUnsyncedMessages(): Promise<Message[]>
  
  // Mark messages as read
  async markAsRead(buddyId: string, userId: string): Promise<void>
  
  // Archive old messages (90+ days)
  async archiveOldMessages(daysOld: number = 90): Promise<number>
  
  // Get message count for a buddy
  async getMessageCount(buddyId: string): Promise<number>
}
```

**File**: `src/repositories/BuddyRepository.ts`
```typescript
class BuddyRepository {
  // Get all buddies for user
  async getBuddies(userId: string): Promise<Buddy[]>
  
  // Get single buddy
  async getBuddy(buddyId: string): Promise<Buddy | null>
  
  // Insert/update buddy
  async upsertBuddy(buddy: Buddy): Promise<void>
  
  // Update last message
  async updateLastMessage(buddyId: string, message: string, timestamp: Date): Promise<void>
  
  // Increment unread count
  async incrementUnreadCount(buddyId: string): Promise<void>
}
```

**File**: `src/repositories/SyncQueueRepository.ts`
```typescript
class SyncQueueRepository {
  // Add operation to queue with priority
  async enqueue(operation: SyncOperation, priority: number = 5): Promise<void> {
    await db.execute(`
      INSERT INTO sync_queue 
      (operation_type, table_name, record_id, data, priority)
      VALUES (?, ?, ?, ?, ?)
    `, [operation.operation_type, operation.table_name, operation.record_id,
        JSON.stringify(operation.data), priority]);
  }
  
  // Get pending operations (ordered by priority, then creation time)
  async getPending(limit: number = 50): Promise<SyncOperation[]> {
    const result = await db.execute(`
      SELECT * FROM sync_queue
      WHERE retry_count < 3
      ORDER BY priority ASC, created_at ASC
      LIMIT ?
    `, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      operation_type: row.operation_type,
      table_name: row.table_name,
      record_id: row.record_id,
      data: JSON.parse(row.data),
      created_at: row.created_at,
      retry_count: row.retry_count,
      last_error: row.last_error,
      priority: row.priority
    }));
  }
  
  // Mark as synced
  async markSynced(operationId: number): Promise<void>
  
  // Mark as error
  async markError(operationId: number, error: string): Promise<void>
  
  // Retry failed operations (with exponential backoff)
  async retryFailed(maxRetries: number = 3): Promise<void>
  
  // Clean up old completed operations (7+ days old)
  async cleanupOldEntries(daysOld: number = 7): Promise<number>
}
```

#### **2.2 Data Models**

**File**: `src/types/localDatabase.ts`
```typescript
interface LocalMessage {
  id: string;
  buddy_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'emoji';
  is_read: boolean;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  sync_status: 'synced' | 'pending' | 'error';
  local_id?: string;
  server_id?: string;
}

interface LocalBuddy {
  id: string;
  user_id: string;
  buddy_user_id: string;
  name: string;
  initials: string;
  avatar_url?: string;
  is_pinned: boolean;
  is_online: boolean;
  status: 'active' | 'away' | 'busy' | 'invisible';
  mood?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  sync_status: 'synced' | 'pending' | 'error';
}

interface SyncOperation {
  id?: number;
  operation_type: 'insert' | 'update' | 'delete';
  table_name: string;
  record_id: string;
  data: any;
  created_at?: string;
  retry_count?: number;
  last_error?: string;
  priority?: number;  // 1=highest, 10=lowest
}
```

---

### **Phase 3: Sync Service Implementation** ⏱️ *Week 1.5* (Priority Queue + Adaptive Sync)

#### **3.1 Sync Strategy**

**Two-Way Sync Pattern:**
1. **Push**: Local changes → Supabase (priority-based)
2. **Pull**: Supabase changes → Local database
3. **Conflict Resolution**: Handle conflicts intelligently
4. **Adaptive Scheduling**: Adjust sync frequency based on app state

#### **3.2 Sync Service**

**File**: `src/services/syncService.ts`

```typescript
class SyncService {
  // Full sync (on app start or manual refresh)
  async fullSync(userId: string): Promise<void>
  
  // Incremental sync (background, periodic)
  async incrementalSync(userId: string, lastSyncTime: string): Promise<void>
  
  // Push pending changes
  async pushPendingChanges(): Promise<void>
  
  // Pull new changes from server
  async pullChanges(userId: string, lastSyncTime: string): Promise<void>
  
  // Sync specific entity
  async syncMessages(buddyId: string): Promise<void>
  async syncBuddies(userId: string): Promise<void>
  async syncUsers(userIds: string[]): Promise<void>
  
  // Conflict resolution
  async resolveConflict(local: any, server: any): Promise<any>
}
```

#### **3.3 Sync Triggers**

**When to Sync:**
1. **App Start**: Full sync of recent data
2. **Background**: Periodic incremental sync (every 5 minutes)
3. **After Send**: Immediate push of sent message
4. **After Receive**: Pull new messages via WebSocket/Realtime
5. **Manual Refresh**: User-triggered full sync
6. **Network Reconnect**: Sync pending changes

**File**: `src/services/syncManager.ts`
```typescript
import { AppState } from 'react-native';

class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  
  /**
   * Start adaptive background sync
   * Adjusts frequency based on app state
   */
  startAdaptiveSync(): void {
    this.isActive = true;
    
    // Sync more frequently when app is active
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && this.isActive) {
        this.startBackgroundSync(2 * 60 * 1000); // 2 minutes when active
      } else if (nextAppState === 'background' && this.isActive) {
        this.startBackgroundSync(10 * 60 * 1000); // 10 minutes when background
      }
    });
    
    // Start with active state
    this.startBackgroundSync(2 * 60 * 1000);
  }
  
  /**
   * Start background sync with interval
   */
  startBackgroundSync(interval: number): void {
    this.stopBackgroundSync(); // Clear existing
    
    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, interval);
  }
  
  /**
   * Perform sync - only sync recent/active buddies
   */
  private async performSync(): Promise<void> {
    try {
      // Only sync buddies with activity in last 24 hours
      const recentBuddies = await buddyRepository.getBuddiesWithActivitySince(
        userId,
        Date.now() - 24 * 60 * 60 * 1000
      );
      
      // Sync messages for active buddies only
      for (const buddy of recentBuddies) {
        await syncService.syncMessages(buddy.id);
      }
      
      // Always sync pending queue (priority-based)
      await syncService.pushPendingChanges();
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }
  
  // Stop background sync
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // Handle network state changes
  onNetworkStateChange(isConnected: boolean): void {
    if (isConnected) {
      // Network reconnected - sync immediately
      syncService.pushPendingChanges().catch(console.error);
    }
  }
  
  // Queue sync operation with priority
  queueSync(operation: SyncOperation, priority: number = 5): void {
    syncQueueRepository.enqueue(operation, priority).catch(console.error);
  }
}
```

---

### **Phase 4: Integration with Existing Services** ⏱️ *Week 4*

#### **4.1 Update Chat Service**

**Modify**: `src/services/unifiedChatService.ts`

**Changes:**
- Check local database first
- Fallback to Supabase if local data missing
- Write to local database immediately
- Queue sync operation

```typescript
// Before: Direct Supabase call
static async getMessages(buddyId: string, userId: string) {
  const { data } = await supabase.from('buddy_messages')...
}

// After: Local-first approach
static async getMessages(buddyId: string, userId: string) {
  // 1. Try local database first
  const localMessages = await messageRepository.getMessages(buddyId, 50, 0);
  if (localMessages.length > 0) {
    return localMessages; // Instant return
  }
  
  // 2. Fetch from Supabase in background
  const serverMessages = await this.fetchFromSupabase(buddyId);
  
  // 3. Save to local database
  await messageRepository.bulkInsert(serverMessages);
  
  // 4. Return local messages
  return localMessages;
}
```

#### **4.2 Update Message Sending**

**Optimistic Updates:**
```typescript
static async sendMessage(buddyId: string, content: string, userId: string) {
  // 1. Generate temporary local ID
  const localId = generateUUID();
  
  // 2. Insert into local database immediately
  const message = {
    id: localId,
    buddy_id: buddyId,
    sender_id: userId,
    content,
    sync_status: 'pending',
    created_at: new Date().toISOString()
  };
  await messageRepository.insertMessage(message);
  
  // 3. Update UI immediately (optimistic)
  // ... trigger UI update
  
  // 4. Queue sync operation
  await syncQueueRepository.enqueue({
    operation_type: 'insert',
    table_name: 'messages',
    record_id: localId,
    data: message
  });
  
  // 5. Try immediate sync (if online)
  if (isOnline) {
    await syncService.pushPendingChanges();
  }
}
```

#### **4.3 Real-time Integration**

**Combine Supabase Realtime with Local DB:**
```typescript
// Listen to Supabase realtime
supabase
  .channel('buddy_messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'buddy_messages' }, 
    async (payload) => {
      // 1. Check if message already exists locally
      const exists = await messageRepository.getMessage(payload.new.id);
      if (exists) return; // Already synced
      
      // 2. Insert into local database
      await messageRepository.insertMessage(payload.new);
      
      // 3. Update UI
      // ... trigger UI update
    }
  )
  .subscribe();
```

---

### **Phase 5: Migration & Data Seeding** ⏱️ *Week 1.5* (Chunked Migration to Prevent OOM)

#### **5.1 Initial Data Migration with Chunking**

**⚠️ CRITICAL: Use chunked migration to prevent Out of Memory (OOM) errors**

**On First App Launch:**
1. Create local database
2. Fetch user's data from Supabase (chunked)
3. Bulk insert into local database (batches)
4. Show migration progress to user
5. Set sync metadata

**File**: `src/services/migrationService.ts`
```typescript
class MigrationService {
  private readonly CHUNK_SIZE = 100; // Messages per batch
  private readonly BUDDY_CHUNK_SIZE = 20; // Buddies per batch
  
  /**
   * Migrate existing data from Supabase with progress tracking
   * Prevents OOM by processing in chunks
   */
  async migrateFromSupabase(
    userId: string,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<void> {
    try {
      // 1. Fetch buddies (usually small, can fetch all)
      const { data: buddies, error: buddiesError } = await supabase
        .from('buddies')
        .select('*')
        .eq('user_id', userId);
      
      if (buddiesError) throw buddiesError;
      
      // Insert buddies in chunks
      for (let i = 0; i < buddies.length; i += this.BUDDY_CHUNK_SIZE) {
        const chunk = buddies.slice(i, i + this.BUDDY_CHUNK_SIZE);
        await buddyRepository.bulkInsert(chunk);
        
        onProgress?.({
          stage: 'buddies',
          completed: i + chunk.length,
          total: buddies.length,
          percentage: ((i + chunk.length) / buddies.length) * 100
        });
      }
      
      // 2. Fetch messages for each buddy (chunked to prevent OOM)
      let totalMessages = 0;
      let processedMessages = 0;
      
      // First, count total messages
      for (const buddy of buddies) {
        const { count } = await supabase
          .from('buddy_messages')
          .select('*', { count: 'exact', head: true })
          .eq('buddy_id', buddy.id);
        totalMessages += count || 0;
      }
      
      // Migrate messages for each buddy in chunks
      for (const buddy of buddies) {
        await this.migrateMessagesForBuddy(
          buddy.id,
          (chunkProgress) => {
            processedMessages += chunkProgress.processed;
            onProgress?.({
              stage: 'messages',
              completed: processedMessages,
              total: totalMessages,
              percentage: (processedMessages / totalMessages) * 100,
              currentBuddy: buddy.name
            });
          }
        );
      }
      
      // 3. Set sync timestamp
      await syncMetadataRepository.set('last_sync', new Date().toISOString());
      await syncMetadataRepository.set('migration_completed', 'true');
      
      onProgress?.({
        stage: 'complete',
        completed: totalMessages,
        total: totalMessages,
        percentage: 100
      });
      
    } catch (error) {
      console.error('Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }
  
  /**
   * Migrate messages for a single buddy in chunks
   * Prevents memory issues with large message histories
   */
  private async migrateMessagesForBuddy(
    buddyId: string,
    onChunkProgress?: (progress: { processed: number }) => void
  ): Promise<void> {
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data: messages, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .eq('buddy_id', buddyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + this.CHUNK_SIZE - 1);
      
      if (error) {
        console.error(`Error fetching messages for buddy ${buddyId}:`, error);
        break;
      }
      
      if (messages && messages.length > 0) {
        // Insert chunk into local database
        await messageRepository.bulkInsert(messages);
        
        offset += this.CHUNK_SIZE;
        hasMore = messages.length === this.CHUNK_SIZE;
        
        onChunkProgress?.({ processed: messages.length });
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        hasMore = false;
      }
    }
  }
}

interface MigrationProgress {
  stage: 'buddies' | 'messages' | 'complete';
  completed: number;
  total: number;
  percentage: number;
  currentBuddy?: string;
}
```

#### **5.2 Incremental Migration**

**For Existing Users:**
- Detect if local database exists
- If exists, do incremental sync
- If not, do full migration

---

### **Phase 6: Performance Optimization & Maintenance** ⏱️ *Week 1* (Database Maintenance + Size Management)

#### **6.1 Database Indexing**

**Critical Indexes:**
- Messages by buddy_id + created_at (for chat loading)
- Messages by sync_status (for sync operations)
- Messages by id (UNIQUE - prevent duplicates)
- Buddies by user_id (for buddy list)
- Sync queue by priority + created_at (for priority-based sync)

#### **6.2 Database Size Management**

**⚠️ CRITICAL: Implement automatic cleanup to prevent database bloat**

**File**: `src/services/databaseMaintenanceService.ts`

```typescript
class DatabaseMaintenanceService {
  /**
   * Perform periodic database maintenance
   * Run weekly or when app is idle
   */
  async performMaintenance(): Promise<void> {
    try {
      // 1. Validate database integrity (full check)
      const integrity = await this.validateDatabaseIntegrity();
      if (!integrity.isValid) {
        console.error('❌ Database integrity check failed during maintenance');
        await this.handleCorruption();
        return; // Stop maintenance if corruption detected
      }
      
      // 2. Vacuum database (reclaim space from deleted records)
      await db.execute('VACUUM');
      
      // 3. Analyze query planner statistics (improve query performance)
      await db.execute('ANALYZE');
      
      // 4. Clean up old sync queue entries (7+ days old, failed 3+ times)
      const deletedQueueEntries = await db.execute(`
        DELETE FROM sync_queue 
        WHERE created_at < datetime('now', '-7 days')
        AND retry_count >= 3
      `);
      
      // 5. Archive old messages (30+ days default, configurable)
      const retentionDays = await this.getRetentionDays(); // Default: 30
      const archivedCount = await this.archiveOldMessages(retentionDays);
      
      // 6. Clean up orphaned records
      await this.cleanupOrphanedRecords();
      
      console.log(`✅ Maintenance complete: ${archivedCount} messages archived`);
    } catch (error) {
      console.error('Maintenance error:', error);
    }
  }
  
  /**
   * Get message retention days from user preferences
   * Default: 30 days (conservative, like WhatsApp)
   */
  private async getRetentionDays(): Promise<number> {
    const preference = await userPreferencesRepository.getRetentionPreference();
    return preference?.retentionDays || 30; // Default: 30 days
  }
  
  /**
   * Archive messages older than specified days
   * Moves to separate archive table (not deleted)
   * Default: 30 days (conservative approach)
   */
  async archiveOldMessages(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Get old messages
    const oldMessages = await db.execute(`
      SELECT * FROM local_messages
      WHERE created_at < ?
      AND sync_status = 'synced'
      ORDER BY created_at ASC
    `, [cutoffDate.toISOString()]);
    
    if (oldMessages.rows.length === 0) return 0;
    
    // Move to archive table (create if doesn't exist)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS local_messages_archive (
        id TEXT PRIMARY KEY,
        buddy_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        content TEXT NOT NULL,
        message_type TEXT,
        is_read INTEGER,
        created_at TEXT,
        archived_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert into archive
    for (const message of oldMessages.rows) {
      await db.execute(`
        INSERT INTO local_messages_archive 
        (id, buddy_id, sender_id, receiver_id, content, message_type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [message.id, message.buddy_id, message.sender_id, message.receiver_id,
          message.content, message.message_type, message.is_read, message.created_at]);
    }
    
    // Delete from main table (keep only last 500 messages per buddy)
    for (const buddyId of [...new Set(oldMessages.rows.map(m => m.buddy_id))]) {
      // Keep last 500 messages per buddy
      await db.execute(`
        DELETE FROM local_messages
        WHERE buddy_id = ?
        AND id NOT IN (
          SELECT id FROM local_messages
          WHERE buddy_id = ?
          ORDER BY created_at DESC
          LIMIT 500
        )
        AND created_at < ?
      `, [buddyId, buddyId, cutoffDate.toISOString()]);
    }
    
    return oldMessages.rows.length;
  }
  
  /**
   * Clean up orphaned records
   */
  private async cleanupOrphanedRecords(): Promise<void> {
    // Remove messages for deleted buddies
    await db.execute(`
      DELETE FROM local_messages
      WHERE buddy_id NOT IN (SELECT id FROM local_buddies)
    `);
  }
  
  /**
   * Get database size information
   */
  async getDatabaseStats(): Promise<{
    totalMessages: number;
    archivedMessages: number;
    pendingSync: number;
    databaseSize: number;
  }> {
    const [messages] = await db.execute('SELECT COUNT(*) as count FROM local_messages');
    const [archived] = await db.execute('SELECT COUNT(*) as count FROM local_messages_archive');
    const [pending] = await db.execute('SELECT COUNT(*) as count FROM sync_queue WHERE retry_count < 3');
    
    return {
      totalMessages: messages.rows[0].count,
      archivedMessages: archived.rows[0].count,
      pendingSync: pending.rows[0].count,
      databaseSize: 0 // Calculate from file system
    };
  }
  
  /**
   * Validate database integrity
   * Run PRAGMA integrity_check to detect corruption
   * Schedule: Run on app start (fast check) + weekly (full check)
   */
  async validateDatabaseIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      // Run PRAGMA integrity_check
      const result = await db.execute('PRAGMA integrity_check');
      
      // Check if integrity check passed
      const integrityCheck = result.rows[0]?.integrity_check;
      
      if (integrityCheck !== 'ok') {
        // Database corrupted - collect all errors
        const errors = result.rows
          .map((row: any) => row.integrity_check)
          .filter((check: string) => check !== 'ok');
        
        console.error('❌ Database integrity check failed:', errors);
        
        return { 
          isValid: false, 
          errors 
        };
      }
      
      return { isValid: true, errors: [] };
    } catch (error) {
      console.error('Error running integrity check:', error);
      return { 
        isValid: false, 
        errors: [`Integrity check failed: ${error.message}`] 
      };
    }
  }
  
  /**
   * Handle database corruption
   * Attempts recovery or triggers re-migration
   */
  async handleCorruption(): Promise<void> {
    console.warn('⚠️ Database corruption detected, attempting recovery...');
    
    try {
      // 1. Try to backup current database
      await this.backupDatabase();
      
      // 2. Attempt recovery using PRAGMA quick_check first
      const quickCheck = await db.execute('PRAGMA quick_check');
      if (quickCheck.rows[0]?.quick_check === 'ok') {
        // Quick check passed, try full recovery
        await db.execute('PRAGMA integrity_check');
      }
      
      // 3. If recovery fails, trigger re-migration
      const isValid = await this.validateDatabaseIntegrity();
      if (!isValid.isValid) {
        console.error('❌ Database recovery failed, triggering re-migration');
        // Clear local database and re-migrate
        await LocalDatabaseService.clear();
        await MigrationService.migrateFromSupabase(userId);
      }
    } catch (error) {
      console.error('Recovery error:', error);
      // Last resort: clear and re-migrate
      await LocalDatabaseService.clear();
      await MigrationService.migrateFromSupabase(userId);
    }
  }
}
```

**User Preferences for Message Retention:**
```typescript
// Recommended defaults (conservative approach)
const MESSAGE_RETENTION_DAYS = {
  default: 30,      // Most users: 30 days (like WhatsApp)
  medium: 90,       // Power users: 90 days
  extended: 180,    // Max: 180 days
  keepLast: 500     // Always keep last 500 per buddy
};

// Add to user preferences
interface MessageRetentionPreference {
  retentionDays: 7 | 30 | 90 | 180 | 'unlimited';
  autoArchive: boolean;
  keepLastMessages: number; // Default: 500
}

// Why 30 days default:
// - WhatsApp keeps ~30 days locally
// - Telegram allows unlimited (but user choice)
// - 90 days = potentially 20-30MB per heavy user
// - 30 days is safer default (10-15MB per user)
```

#### **6.2 Pagination**

**Implement Message Pagination:**
```typescript
async getMessages(buddyId: string, limit: number = 50, offset: number = 0) {
  return await db.execute(
    `SELECT * FROM local_messages 
     WHERE buddy_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [buddyId, limit, offset]
  );
}
```

#### **6.3 Batch Operations**

**Bulk Inserts:**
```typescript
async bulkInsert(messages: Message[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const message of messages) {
      await tx.execute('INSERT INTO local_messages ...', [message]);
    }
  });
}
```

#### **6.4 Cache Management**

**Implement LRU Cache for Frequently Accessed Data:**
- Cache recent messages in memory
- Cache buddy list in memory
- Clear cache on memory pressure

---

### **Phase 7: Error Handling & Conflict Resolution** ⏱️ *Week 1* (Improved Conflict Resolution)

#### **7.1 Conflict Resolution Strategies**

**Last-Write-Wins (Default for Content):**
```typescript
async resolveConflict(local: Message, server: Message): Promise<Message> {
  // Compare timestamps
  const localTime = new Date(local.updated_at).getTime();
  const serverTime = new Date(server.updated_at).getTime();
  
  // Use most recent
  return serverTime > localTime ? server : local;
}
```

**Read Status Resolution (Timestamp-Based):**
```typescript
async resolveReadStatus(local: Message, server: Message): Promise<Message> {
  // Use timestamp-based resolution for read status
  if (local.read_at && server.read_at) {
    // Both have read timestamps, use most recent
    const localReadTime = new Date(local.read_at).getTime();
    const serverReadTime = new Date(server.read_at).getTime();
    return localReadTime > serverReadTime ? local : server;
  }
  
  // If only one has read timestamp, that one wins
  if (local.read_at && !server.read_at) return local;
  if (server.read_at && !local.read_at) return server;
  
  // Neither read - use most recent update
  return this.resolveConflict(local, server);
}
```

**Merge Strategy (For Complex Cases):**
- Merge non-conflicting fields
- Prefer server for critical fields (id, timestamps)
- Prefer local for user-specific fields (is_read)
- Handle future "mark as unread" feature

#### **7.2 Error Handling**

**Retry Logic:**
```typescript
async syncWithRetry(operation: SyncOperation, maxRetries: number = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.syncOperation(operation);
      return; // Success
    } catch (error) {
      if (i === maxRetries - 1) {
        // Mark as error, user can retry manually
        await syncQueueRepository.markError(operation.id, error.message);
      }
      // Exponential backoff
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

#### **7.3 Data Integrity**

**Validation:**
- Validate data before insert
- Check foreign key constraints
- Verify data types
- Handle corrupted data gracefully

---

### **Phase 8: Testing & Quality Assurance** ⏱️ *Week 1.5* (Comprehensive Testing + Performance Benchmarks)

#### **8.1 Unit Tests**

**Test Repositories:**
- MessageRepository tests
- BuddyRepository tests
- SyncQueueRepository tests

#### **8.2 Integration Tests**

**Test Sync Service:**
- Full sync test
- Incremental sync test
- Conflict resolution test
- Offline operation test
- Priority queue ordering test

#### **8.3 E2E Tests**

**Test Scenarios:**
1. Send message offline → comes online → syncs
2. Receive message while offline → comes online → syncs
3. Conflict resolution scenarios
4. Large dataset performance
5. Database migration (chunked)
6. Database maintenance and archiving

#### **8.4 Performance Benchmarks (MANDATORY)**

**File**: `src/__tests__/performance/databasePerformance.test.ts`

```typescript
describe('Database Performance Benchmarks', () => {
  const buddyId = 'test-buddy-id';
  
  beforeEach(async () => {
    // Setup test database
    await LocalDatabaseService.initialize();
  });
  
  it('should load 50 messages in < 100ms', async () => {
    // Insert 50 test messages
    await insertTestMessages(buddyId, 50);
    
    const start = Date.now();
    const messages = await messageRepository.getMessages(buddyId, 50, 0);
    const duration = Date.now() - start;
    
    expect(messages.length).toBe(50);
    expect(duration).toBeLessThan(100); // < 100ms
    console.log(`✅ Load 50 messages: ${duration}ms`);
  });
  
  it('should insert message in < 50ms', async () => {
    const testMessage = createTestMessage(buddyId);
    
    const start = Date.now();
    await messageRepository.insertMessage(testMessage);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50); // < 50ms
    console.log(`✅ Insert message: ${duration}ms`);
  });
  
  it('should handle 1000 concurrent reads', async () => {
    await insertTestMessages(buddyId, 50);
    
    const promises = Array(1000).fill(null).map(() => 
      messageRepository.getMessages(buddyId, 50, 0)
    );
    
    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // < 1ms per query average
    console.log(`✅ 1000 concurrent reads: ${duration}ms (${duration/1000}ms avg)`);
  });
  
  it('should sync 1000 messages in < 5 seconds', async () => {
    const messages = await insertTestMessages(buddyId, 1000);
    
    const start = Date.now();
    await syncService.syncMessages(buddyId);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // < 5 seconds
    console.log(`✅ Sync 1000 messages: ${duration}ms`);
  });
  
  it('should handle 10,000 messages without performance degradation', async () => {
    await insertTestMessages(buddyId, 10000);
    
    const start = Date.now();
    const messages = await messageRepository.getMessages(buddyId, 50, 0);
    const duration = Date.now() - start;
    
    expect(messages.length).toBe(50);
    expect(duration).toBeLessThan(150); // Slightly higher for large DB
    console.log(`✅ Load from 10k message DB: ${duration}ms`);
  });
  
  it('should maintain < 50MB database size with 10k messages', async () => {
    await insertTestMessages(buddyId, 10000);
    
    const stats = await databaseMaintenanceService.getDatabaseStats();
    const dbSize = await getDatabaseFileSize();
    
    expect(dbSize).toBeLessThan(50 * 1024 * 1024); // < 50MB
    console.log(`✅ Database size with 10k messages: ${(dbSize / 1024 / 1024).toFixed(2)}MB`);
  });
});
```

**Performance Targets:**
- ✅ Message load (50 messages): < 100ms
- ✅ Message insert: < 50ms
- ✅ 1000 concurrent reads: < 1000ms total (< 1ms avg)
- ✅ Sync 1000 messages: < 5 seconds
- ✅ Database size (10k messages): < 50MB

#### **8.5 Sync Status UI Testing**

**File**: `src/__tests__/ui/syncStatusIndicator.test.tsx`

```typescript
describe('Sync Status UI Indicators', () => {
  it('should display sync status in message bubbles', () => {
    // Test pending state
    const pendingMessage = { sync_status: 'pending', ... };
    const { getByTestId } = render(
      <MessageBubble message={pendingMessage} />
    );
    expect(getByTestId('sync-status-pending')).toBeTruthy();
    
    // Test synced state (no indicator)
    const syncedMessage = { sync_status: 'synced', ... };
    const { queryByTestId } = render(
      <MessageBubble message={syncedMessage} />
    );
    expect(queryByTestId('sync-status')).toBeNull();
  });
  
  it('should show global sync status bar', () => {
    const { getByText } = render(
      <SyncStatusBar 
        isSyncing={true}
        pendingCount={5}
      />
    );
    expect(getByText('5 pending')).toBeTruthy();
  });
  
  it('should display offline mode indicator', () => {
    const { getByText } = render(
      <SyncStatusIndicator 
        syncStatus="error"
        lastSyncTime={new Date()}
      />
    );
    expect(getByText(/offline/i)).toBeTruthy();
  });
});
```

**UI Testing Checklist:**
- [ ] Test sync status indicators in UI
- [ ] Verify message bubbles show pending/error states
- [ ] Test global sync status bar
- [ ] Validate offline mode indicators
- [ ] Test sync status updates in real-time
- [ ] Verify error state displays correctly
- [ ] Test sync status during network transitions

---

## 📦 **Dependencies to Add**

```json
{
  "dependencies": {
    "react-native-quick-sqlite": "^7.0.0",
    "@react-native-async-storage/async-storage": "^1.24.0" // Already installed
  },
  "devDependencies": {
    "@types/react-native-quick-sqlite": "^1.0.0"
  }
}
```

---

## 🗂️ **File Structure**

```
src/
├── database/
│   ├── localDatabaseService.ts      # Database initialization
│   ├── migrations/                   # Database migrations
│   │   ├── 001_initial_schema.ts
│   │   └── 002_add_sync_metadata.ts
│   └── types.ts                      # Database types
├── repositories/
│   ├── MessageRepository.ts
│   ├── BuddyRepository.ts
│   ├── UserRepository.ts
│   └── SyncQueueRepository.ts
├── services/
│   ├── syncService.ts                # Sync logic
│   ├── syncManager.ts                # Sync orchestration
│   └── migrationService.ts           # Data migration
└── types/
    └── localDatabase.ts              # TypeScript types
```

---

## 🎯 **Success Metrics**

### **Performance:**
- ✅ Message load time: < 100ms (from local DB)
- ✅ App startup time: < 2 seconds (with local data)
- ✅ Offline message send: < 50ms (local insert)

### **Reliability:**
- ✅ 99.9% sync success rate
- ✅ Zero data loss
- ✅ Proper conflict resolution

### **User Experience:**
- ✅ Instant message loading
- ✅ Offline functionality
- ✅ Seamless sync (user doesn't notice)

---

## ⚠️ **Risks & Mitigations**

### **Risk 1: Database Size Growth**
**Mitigation:**
- Implement message archiving (move old messages to separate table)
- Limit local message history (e.g., last 6 months)
- Periodic cleanup of synced data

### **Risk 2: Sync Conflicts**
**Mitigation:**
- Implement robust conflict resolution
- Log conflicts for analysis
- User notification for critical conflicts

### **Risk 3: Migration Complexity**
**Mitigation:**
- Phased rollout (beta users first)
- Rollback plan
- Data backup before migration

### **Risk 4: Performance Degradation**
**Mitigation:**
- Proper indexing
- Query optimization
- Performance monitoring

---

## 🚀 **Rollout Strategy & Rollback Plan**

### **Phase 1: Beta Testing** (Week 10)
- Deploy to 10% of users
- Monitor performance and errors
- Collect feedback
- **Feature Flag**: `USE_LOCAL_DATABASE = false` (can disable instantly)

### **Phase 2: Gradual Rollout** (Week 11)
- Increase to 50% of users
- Fix critical issues
- Optimize performance
- **Feature Flag**: `USE_LOCAL_DATABASE = true` (for selected users)

### **Phase 3: Full Rollout** (Week 12)
- Deploy to 100% of users
- Monitor closely for first week
- Document learnings

---

### **🔄 Detailed Rollback Plan (MANDATORY)**

**⚠️ CRITICAL: Rollback plan must be ready before any deployment**

#### **Immediate Rollback (< 5 minutes)**

**If critical issues occur:**

1. **Deploy Previous Version**
   ```bash
   # Via CodePush or app store hotfix
   # Revert to previous app version
   ```

2. **Disable Feature Flag**
   ```typescript
   // In config/migrationConfig.ts
   export const USE_LOCAL_DATABASE = false; // Disable immediately
   ```

3. **App Falls Back to Supabase-Only Mode**
   - All services automatically use Supabase
   - Local database is NOT deleted (data preserved)
   - Users continue with cloud-only mode

#### **Rollback Triggers**

Rollback immediately if:
- ✅ Crash rate > 5%
- ✅ Sync failure rate > 10%
- ✅ User reports of data loss
- ✅ Performance regression > 50%
- ✅ Database corruption detected
- ✅ Encryption key errors

#### **Data Preservation During Rollback**

**Critical**: Local database is NOT deleted during rollback
- User data remains safe in local SQLite
- Next app update can retry migration
- No data loss risk

**Rollback Process:**
```typescript
// In App.tsx or migration service
if (ROLLBACK_REQUIRED) {
  // 1. Disable local database usage
  config.USE_LOCAL_DATABASE = false;
  
  // 2. Keep local DB intact (don't delete)
  // Local database file remains: whispr.db
  
  // 3. All services fall back to Supabase
  // No code changes needed - feature flag handles it
  
  // 4. Log rollback event
  analytics.track('local_database_rollback', {
    reason: rollbackReason,
    timestamp: new Date().toISOString()
  });
}
```

#### **Post-Rollback Actions**

1. **Analyze Issues**
   - Review crash logs
   - Analyze sync failure patterns
   - Identify root cause

2. **Fix Issues**
   - Fix bugs in development branch
   - Improve error handling
   - Add additional safeguards

3. **Re-test**
   - Test fixes thoroughly
   - Re-run performance benchmarks
   - Validate with beta users

4. **Re-deploy**
   - Deploy to beta users only (10%)
   - Monitor for 48 hours
   - Gradually increase if stable

#### **Rollback Communication**

**User-Facing:**
- No user action required
- App continues working (Supabase mode)
- Seamless transition

**Internal:**
- Alert team immediately
- Document rollback reason
- Create post-mortem report

---

## 📚 **Additional Considerations**

### **✅ Encryption: MANDATORY** (Already in Phase 1)
- Database encryption is required (not optional)
- Use `@op-engineering/op-sqlite-encrypted` or SQLCipher
- Encryption key stored in Keychain/Keystore
- See Phase 1.1.1 for implementation details

### **Sync Status UI Indicators**

**File**: `src/components/SyncStatusIndicator.tsx`

```typescript
interface SyncStatusIndicatorProps {
  syncStatus: 'synced' | 'pending' | 'syncing' | 'error';
  lastSyncTime?: Date;
  pendingCount?: number;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncStatus,
  lastSyncTime,
  pendingCount
}) => {
  const getIcon = () => {
    switch (syncStatus) {
      case 'synced': return 'checkmark-circle';
      case 'pending': return 'time-outline';
      case 'syncing': return 'sync';
      case 'error': return 'alert-circle';
    }
  };
  
  return (
    <View style={styles.container}>
      <Icon name={getIcon()} size={16} />
      {pendingCount > 0 && (
        <Text style={styles.count}>{pendingCount}</Text>
      )}
    </View>
  );
};
```

**Message Sync Status in Chat:**
```typescript
// In message bubble component
<MessageBubble 
  message={message}
  syncStatus={
    message.sync_status === 'pending' ? 'clock' :
    message.sync_status === 'syncing' ? 'spinner' :
    message.sync_status === 'error' ? 'exclamation' :
    null // synced - no indicator
  }
/>
```

### **Backup & Export:**
- Implement local database backup
- Export/import functionality for user data
- Cloud backup option (future feature)

### **Analytics & Monitoring:**
- Track sync performance metrics
- Monitor database size growth
- Track error rates and types
- Sync success/failure rates
- Migration completion rates

### **Documentation:**
- User-facing: Explain offline functionality
- Developer: Document sync logic
- Troubleshooting: Common issues and solutions
- Migration guide for users

### **Message Reactions & Replies Sync:**
Ensure sync handles reactions and replies:
```typescript
// In syncService.ts
async syncMessages(buddyId: string): Promise<void> {
  await this.syncBaseMessages(buddyId);
  await this.syncReactions(buddyId);  // Sync reactions
  await this.syncReplies(buddyId);   // Sync replies
}
```

---

## ✅ **Checklist**

### **Pre-Implementation:**
- [ ] Review and approve plan
- [ ] Set up development environment
- [ ] Create feature branch
- [ ] Set up testing infrastructure

### **Implementation:**
- [ ] Phase 1: Database setup
- [ ] Phase 2: Data access layer
- [ ] Phase 3: Sync service
- [ ] Phase 4: Integration
- [ ] Phase 5: Migration
- [ ] Phase 6: Optimization
- [ ] Phase 7: Error handling
- [ ] Phase 8: Testing

### **Post-Implementation:**
- [ ] Performance validation
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Deployment

---

## 🔍 **Impact Analysis: Codebase Changes Required**

This section details all changes required in the existing codebase to implement the local database solution.

---

### **📁 Files to be Created (New Files)**

#### **Database Layer (New)**
```
src/database/
├── localDatabaseService.ts          # NEW: Database initialization & connection
├── migrations/
│   ├── 001_initial_schema.ts        # NEW: Initial schema migration
│   ├── 002_add_sync_metadata.ts      # NEW: Sync metadata migration
│   └── migrationRunner.ts            # NEW: Migration execution engine
└── types.ts                          # NEW: Database-specific types
```

#### **Repository Layer (New)**
```
src/repositories/
├── MessageRepository.ts              # NEW: Message data access
├── BuddyRepository.ts                # NEW: Buddy data access
├── UserRepository.ts                 # NEW: User data access
├── SyncQueueRepository.ts            # NEW: Sync queue management
└── BaseRepository.ts                 # NEW: Base repository with common methods
```

#### **Sync Services (New)**
```
src/services/
├── syncService.ts                    # NEW: Core sync logic
├── syncManager.ts                    # NEW: Sync orchestration
└── migrationService.ts               # NEW: Data migration from Supabase
```

---

### **📝 Files to be Modified (Existing Files)**

#### **1. Core Services (Major Changes)**

##### **`src/services/unifiedChatService.ts`**
**Current Behavior:**
- Direct Supabase queries for messages
- In-memory caching only
- No offline support

**Required Changes:**
```typescript
// BEFORE (Current):
static async getMessages(buddyId: string, userId: string): Promise<BuddyMessage[]> {
  const { data } = await supabase
    .from('buddy_messages')
    .select('*')
    .eq('buddy_id', consistentBuddyId)
    .order('created_at', { ascending: true });
  return messages;
}

// AFTER (With Local DB):
static async getMessages(buddyId: string, userId: string): Promise<BuddyMessage[]> {
  // 1. Try local database first (instant)
  const localMessages = await messageRepository.getMessages(buddyId, 50, 0);
  if (localMessages.length > 0) {
    // Trigger background sync
    syncService.syncMessages(buddyId).catch(console.error);
    return localMessages;
  }
  
  // 2. Fallback to Supabase (first time or if local empty)
  const serverMessages = await this.fetchFromSupabase(buddyId);
  await messageRepository.bulkInsert(serverMessages);
  return serverMessages;
}
```

**Impact Level**: 🔴 **HIGH** - Core method completely rewritten

**Changes Required:**
- Import `MessageRepository` and `SyncService`
- Replace all `getMessages()` calls to use local-first approach
- Update `sendMessage()` to write to local DB first, then sync
- Modify `markAsRead()` to update local DB
- Update cache invalidation logic

---

##### **`src/services/buddiesService.ts`**
**Current Behavior:**
- Direct Supabase queries for buddies
- Uses database functions for message sending

**Required Changes:**
```typescript
// BEFORE:
static async getBuddies(userId: string): Promise<Buddy[]> {
  const { data } = await supabase.from('buddies').select('*').eq('user_id', userId);
  return data;
}

// AFTER:
static async getBuddies(userId: string): Promise<Buddy[]> {
  // 1. Get from local database
  const localBuddies = await buddyRepository.getBuddies(userId);
  if (localBuddies.length > 0) {
    syncService.syncBuddies(userId).catch(console.error);
    return localBuddies;
  }
  
  // 2. Fetch from Supabase and cache
  const serverBuddies = await this.fetchFromSupabase(userId);
  await buddyRepository.bulkInsert(serverBuddies);
  return serverBuddies;
}
```

**Impact Level**: 🔴 **HIGH** - Multiple methods need updates

**Changes Required:**
- `getBuddies()` - Local-first approach
- `sendMessage()` - Write to local DB, queue sync
- `markNotificationAsRead()` - Update local DB
- `updateBuddyStatus()` - Update local DB, sync

---

##### **`src/services/cachedBuddiesService.ts`**
**Current Behavior:**
- Wrapper around Supabase with in-memory cache
- Uses AsyncStorage for persistence (limited)

**Required Changes:**
- **Option 1**: Deprecate and redirect to repositories
- **Option 2**: Refactor to use local database instead of AsyncStorage

**Impact Level**: 🟡 **MEDIUM** - Can be refactored or deprecated

**Recommended Approach:**
- Keep for backward compatibility during migration
- Add deprecation warnings
- Redirect calls to new repository layer
- Remove after full migration

---

##### **`src/services/messageCacheService.ts`**
**Current Behavior:**
- Uses AsyncStorage for message caching
- Simple key-value storage

**Required Changes:**
- **Deprecate** - Replaced by SQLite database
- Keep for migration period, then remove

**Impact Level**: 🟢 **LOW** - Will be replaced entirely

**Migration Path:**
1. Keep existing service during Phase 1-2
2. Add deprecation warnings
3. Update all callers to use `MessageRepository`
4. Remove in Phase 8 (cleanup)

---

##### **`src/services/buddyMessagesUnifiedService.ts`**
**Current Behavior:**
- Unified service for buddy messages
- Handles real-time updates

**Required Changes:**
- Update to use local database
- Keep real-time subscription logic
- Write real-time updates to local DB

**Impact Level**: 🟡 **MEDIUM** - Real-time logic stays, data layer changes

**Changes Required:**
- Import repositories
- Update message handling to write to local DB
- Keep Supabase real-time subscriptions
- Sync real-time updates to local DB

---

##### **`src/services/telegramStyleChatService.ts`**
**Current Behavior:**
- Telegram-style chat implementation
- Direct Supabase queries

**Required Changes:**
- Similar to `unifiedChatService.ts`
- Local-first approach for all operations

**Impact Level**: 🔴 **HIGH** - Core chat service

**Changes Required:**
- `getMessages()` - Use local DB
- `sendMessage()` - Write locally, sync
- `getUserChats()` - Use local DB
- All query methods updated

---

##### **`src/services/realtimeService.ts`**
**Current Behavior:**
- Handles Supabase real-time subscriptions
- Updates in-memory cache

**Required Changes:**
- Keep real-time subscription logic
- Write updates to local database instead of memory cache
- Trigger UI updates after local DB write

**Impact Level**: 🟡 **MEDIUM** - Logic stays, storage changes

**Changes Required:**
```typescript
// BEFORE:
private async handleMessageUpdate(payload: any) {
  // Update in-memory cache
  QueryCache.setMessages(buddyId, messages);
}

// AFTER:
private async handleMessageUpdate(payload: any) {
  // Write to local database
  await messageRepository.insertMessage(payload.new);
  // Trigger UI update
  eventEmitter.emit('message-updated', payload);
}
```

---

#### **2. Screen Components (Moderate Changes)**

##### **`src/screens/ChatScreen.tsx`**
**Current Behavior:**
- Calls `CachedBuddiesService.getMessages()`
- Uses `loadMessages()` function that queries Supabase
- Handles real-time updates via DeviceEventEmitter

**Required Changes:**
```typescript
// BEFORE:
const loadMessages = async () => {
  const messages = await CachedBuddiesService.getMessages(buddy.id, user.id);
  setMessages(messages);
};

// AFTER:
const loadMessages = async () => {
  // Load from local DB (instant)
  const messages = await messageRepository.getMessages(buddy.id, 50, 0);
  setMessages(messages);
  
  // Trigger background sync
  syncService.syncMessages(buddy.id).catch(console.error);
};
```

**Impact Level**: 🟡 **MEDIUM** - UI logic mostly unchanged, data source changes

**Changes Required:**
- Update `loadMessages()` function
- Update `handleSendMessage()` to use local-first approach
- Keep real-time listener (will receive updates from sync service)
- Update loading states (should be instant now)

---

##### **`src/screens/TelegramStyleChatScreen.tsx`**
**Current Behavior:**
- Uses `TelegramStyleChatService`
- Similar structure to ChatScreen

**Required Changes:**
- Same as `ChatScreen.tsx`
- Update service calls to use local-first approach

**Impact Level**: 🟡 **MEDIUM**

---

##### **`src/screens/BuddiesScreen.tsx`**
**Current Behavior:**
- Displays list of buddies
- Fetches from Supabase

**Required Changes:**
- Update to use `BuddyRepository`
- Load from local DB first
- Background sync

**Impact Level**: 🟢 **LOW** - Simple data fetch change

---

##### **`src/screens/MessagesScreen.tsx`**
**Current Behavior:**
- Displays chat list
- Currently uses placeholder data

**Required Changes:**
- Update to fetch from local database
- Use `BuddyRepository` for chat list

**Impact Level**: 🟢 **LOW**

---

#### **3. Configuration Files**

##### **`package.json`**
**Required Changes:**
```json
{
  "dependencies": {
    "react-native-quick-sqlite": "^7.0.0"  // ADD THIS
  }
}
```

**Impact Level**: 🟢 **LOW** - Simple dependency addition

---

##### **`App.tsx` or `index.js`**
**Required Changes:**
```typescript
// Add database initialization on app start
import { LocalDatabaseService } from './src/database/localDatabaseService';

// In App component or index.js:
useEffect(() => {
  LocalDatabaseService.initialize()
    .then(() => {
      console.log('✅ Local database initialized');
      // Start sync manager
      SyncManager.startBackgroundSync(5 * 60 * 1000); // 5 minutes
    })
    .catch((error) => {
      console.error('❌ Failed to initialize local database:', error);
    });
}, []);
```

**Impact Level**: 🟡 **MEDIUM** - App initialization changes

---

##### **`src/config/supabase.ts`**
**Current Behavior:**
- Exports Supabase client
- Defines table names

**Required Changes:**
- No changes required (still used for sync)
- May add sync configuration constants

**Impact Level**: 🟢 **LOW** - Minimal or no changes

---

#### **4. Type Definitions**

##### **`src/types/index.ts` or `src/services/buddiesService.ts`**
**Current Behavior:**
- Defines `Buddy` and `BuddyMessage` interfaces

**Required Changes:**
- Add local database types
- Add sync status fields to existing types

**Impact Level**: 🟡 **MEDIUM** - Type extensions needed

**New Types Required:**
```typescript
// Add to existing types
interface BuddyMessage {
  // ... existing fields
  synced_at?: string;        // NEW
  sync_status?: 'synced' | 'pending' | 'error';  // NEW
  local_id?: string;         // NEW (for offline messages)
  server_id?: string;        // NEW (after sync)
}
```

---

#### **5. Store/Context Files**

##### **`src/store/AuthContext.tsx`**
**Current Behavior:**
- Manages authentication state
- Stores user data

**Required Changes:**
- Initialize local database on login
- Trigger initial data migration on first login
- Clear local database on logout

**Impact Level**: 🟡 **MEDIUM**

**Changes Required:**
```typescript
// On login:
const handleLogin = async (user: User) => {
  // ... existing login logic
  
  // Initialize local database
  await LocalDatabaseService.initialize();
  
  // Migrate user data
  await MigrationService.migrateFromSupabase(user.id);
  
  // Start sync
  SyncManager.startBackgroundSync();
};

// On logout:
const handleLogout = async () => {
  // Clear local database
  await LocalDatabaseService.clear();
  
  // ... existing logout logic
};
```

---

### **🗑️ Files to be Deprecated/Removed**

#### **Phase 8 (Cleanup Phase) - Remove After Migration:**

1. **`src/services/messageCacheService.ts`**
   - **Reason**: Replaced by SQLite database
   - **Timeline**: Remove after all callers migrated

2. **Parts of `src/services/cachedBuddiesService.ts`**
   - **Reason**: AsyncStorage caching replaced by SQLite
   - **Timeline**: Refactor or remove after migration

3. **In-memory cache implementations**
   - **Reason**: SQLite is faster and persistent
   - **Timeline**: Remove after validation

---

### **🔄 Breaking Changes**

#### **1. Service Method Signatures**
**Impact**: 🔴 **HIGH**

Some service methods may need signature changes:
```typescript
// BEFORE:
static async getMessages(buddyId: string, userId: string): Promise<BuddyMessage[]>

// AFTER (may add pagination):
static async getMessages(
  buddyId: string, 
  userId: string,
  limit?: number,
  offset?: number
): Promise<BuddyMessage[]>
```

**Mitigation**: Use optional parameters with defaults to maintain backward compatibility.

---

#### **2. Async Behavior Changes**
**Impact**: 🟡 **MEDIUM**

Methods that were async (network calls) will now be mostly synchronous (local DB):
```typescript
// BEFORE: Always async (network)
const messages = await service.getMessages(buddyId, userId);

// AFTER: Instant (local DB), but still async for consistency
const messages = await repository.getMessages(buddyId, 50, 0);
```

**Mitigation**: Keep async/await pattern for consistency, even though local DB is fast.

---

#### **3. Error Handling**
**Impact**: 🟡 **MEDIUM**

Error scenarios change:
- **Before**: Network errors, timeout errors
- **After**: Database errors, sync errors, conflict errors

**Mitigation**: Update error handling to cover both local and sync errors.

---

### **📊 Change Summary by Impact Level**

| Impact Level | Files Count | Effort Estimate |
|-------------|-------------|-----------------|
| 🔴 **HIGH** | 5 files | 3-4 weeks |
| 🟡 **MEDIUM** | 8 files | 2-3 weeks |
| 🟢 **LOW** | 6 files | 1 week |
| **NEW FILES** | 12 files | 2-3 weeks |
| **TOTAL** | **31 files** | **10-11 weeks** (revised) |

---

## ⏱️ **Revised Timeline Summary**

| Phase | Original | Revised | Changes |
|-------|----------|---------|---------|
| **Phase 1: Database Setup** | 1 week | **1.5 weeks** | + Encryption setup |
| **Phase 2: Repositories** | 1 week | **1 week** | ✅ Good estimate |
| **Phase 3: Sync Service** | 1 week | **1.5 weeks** | + Priority queue + Adaptive sync |
| **Phase 4: Integration** | 1 week | **2 weeks** | More complex than estimated |
| **Phase 5: Migration** | 1 week | **1.5 weeks** | + Chunking logic |
| **Phase 6: Optimization** | 1 week | **1 week** | ✅ Good estimate |
| **Phase 7: Error Handling** | 1 week | **1 week** | ✅ Good estimate |
| **Phase 8: Testing** | 1 week | **1.5 weeks** | + Performance benchmarks |
| **TOTAL** | **8 weeks** | **10-11 weeks** | More realistic |

---

### **🛠️ Migration Strategy for Existing Code**

#### **Phase 1: Parallel Implementation**
- Keep existing services working
- Implement new repository layer
- Add feature flag to switch between old/new

#### **Phase 2: Gradual Migration**
- Migrate one service at a time
- Test thoroughly before moving to next
- Keep old code as fallback

#### **Phase 3: Full Cutover**
- Switch all services to use local DB
- Remove old implementations
- Clean up deprecated code

---

### **✅ Testing Requirements**

#### **Files Requiring New Tests:**
1. All new repository files
2. `syncService.ts`
3. `localDatabaseService.ts`
4. Updated service methods

#### **Files Requiring Updated Tests:**
1. `ChatScreen.test.tsx` - Update mocks for local DB
2. `buddiesService.test.ts` - Update for local-first approach
3. `unifiedChatService.test.ts` - Update test expectations

#### **New Test Files Needed:**
```
src/repositories/__tests__/
├── MessageRepository.test.ts
├── BuddyRepository.test.ts
└── SyncQueueRepository.test.ts

src/services/__tests__/
├── syncService.test.ts
└── migrationService.test.ts

src/database/__tests__/
└── localDatabaseService.test.ts
```

---

### **📋 Pre-Implementation Checklist**

Before starting implementation:

- [ ] Review all affected files
- [ ] Create feature branch: `feature/local-database`
- [ ] Set up testing infrastructure
- [ ] Document current behavior of each service
- [ ] Create migration plan for each service
- [ ] Set up feature flags for gradual rollout
- [ ] Prepare rollback plan

---

### **⚠️ Risks & Mitigations**

#### **Risk 1: Breaking Existing Functionality**
**Mitigation**: 
- Implement feature flags
- Keep old code as fallback
- Gradual migration
- Comprehensive testing

#### **Risk 2: Data Loss During Migration**
**Mitigation**:
- Backup Supabase data before migration
- Validate data integrity after migration
- Rollback plan ready

#### **Risk 3: Performance Regression**
**Mitigation**:
- Benchmark before/after
- Optimize database queries
- Monitor performance metrics

---

## 📝 **Notes**

- **Revised Timeline**: 10-11 weeks (more realistic with encryption, chunking, etc.)
- Adjust timeline based on team size and priorities
- Consider breaking into smaller, incremental releases
- Regular code reviews and testing throughout
- **Impact Analysis**: 31 files affected (5 high, 8 medium, 6 low, 12 new)

---

## ✅ **Pre-Implementation Checklist (Updated)**

### **🔒 Security (MANDATORY)**
- [ ] Set up encryption key management (Keychain/Keystore)
- [ ] Choose encrypted SQLite library
- [ ] Test encryption/decryption flow
- [ ] Verify key storage security

### **📊 Performance (MANDATORY)**
- [ ] Define performance benchmarks (< 100ms load time)
- [ ] Set up performance testing infrastructure
- [ ] Create performance test suite
- [ ] Establish baseline metrics

### **🔄 Rollback (MANDATORY)**
- [ ] Implement feature flags
- [ ] Test rollback procedure
- [ ] Document rollback triggers
- [ ] Prepare rollback communication plan

### **📈 Monitoring**
- [ ] Set up crash reporting for local DB errors
- [ ] Configure analytics for sync success/failure rates
- [ ] Set up database size monitoring
- [ ] Create alerting for critical issues
- [ ] Monitor database integrity check results
- [ ] Track corruption detection events

### **📚 Documentation**
- [ ] Create troubleshooting guide for users
- [ ] Document sync logic for developers
- [ ] Create migration user guide
- [ ] Document database schema

### **🧪 Testing**
- [ ] Set up test database infrastructure
- [ ] Create stress tests (10k messages, 100 buddies)
- [ ] Test migration with large datasets
- [ ] Test offline scenarios thoroughly

### **💾 Backup**
- [ ] Implement database export/import
- [ ] Test data recovery procedures
- [ ] Document backup strategy

---

## 🎯 **Success Criteria**

### **Performance Targets:**
- ✅ Message load (50 messages): < 100ms
- ✅ Message insert: < 50ms
- ✅ 1000 concurrent reads: < 1000ms total
- ✅ Sync 1000 messages: < 5 seconds
- ✅ Database size (10k messages): < 50MB

### **Reliability Targets:**
- ✅ 99.9% sync success rate
- ✅ Zero data loss
- ✅ Proper conflict resolution
- ✅ < 1% crash rate

### **User Experience:**
- ✅ Instant message loading
- ✅ Offline functionality working
- ✅ Seamless sync (user doesn't notice)
- ✅ Clear sync status indicators

---

**Last Updated**: 2025-01-XX  
**Status**: Planning Phase (Updated with Review Recommendations)  
**Next Steps**: 
1. Review updated plan
2. Get approval for revised timeline (10-11 weeks)
3. Set up encryption key management
4. Begin Phase 1 (Database Setup with Encryption)

