import { pool } from './db';
import { connectionPoolManager } from './connection-pool-manager';

/**
 * Database Synchronization Manager
 * Handles data consistency and synchronization across the system
 */
class SyncManager {
  private syncQueue: Array<{
    id: string;
    operation: string;
    data: any;
    timestamp: number;
    retries: number;
  }> = [];

  private syncInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private maxRetries = 3;
  private batchSize = 10;

  constructor() {
    this.startSync();
  }

  /**
   * Start automatic synchronization
   */
  startSync(): void {
    if (this.syncInterval) return;

    console.log('🔄 Starting database synchronization manager...');
    
    // Process sync queue every 30 seconds
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 30 * 1000);

    // Initial sync
    this.processSyncQueue();
  }

  /**
   * Stop synchronization
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('🛑 Database synchronization stopped');
  }

  /**
   * Add operation to sync queue
   */
  queueSync(operation: string, data: any): string {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.syncQueue.push({
      id: syncId,
      operation,
      data,
      timestamp: Date.now(),
      retries: 0
    });

    console.log(`📝 Queued sync operation: ${operation} (ID: ${syncId})`);
    return syncId;
  }

  /**
   * Process pending synchronization operations
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) return;

    this.isProcessing = true;
    console.log(`🔄 Processing ${this.syncQueue.length} sync operations...`);

    // Process in batches
    const batch = this.syncQueue.splice(0, this.batchSize);
    const results = await Promise.allSettled(
      batch.map(item => this.executeSyncOperation(item))
    );

    // Handle failed operations
    results.forEach((result, index) => {
      const item = batch[index];
      
      if (result.status === 'rejected') {
        item.retries++;
        
        if (item.retries < this.maxRetries) {
          // Re-queue for retry
          this.syncQueue.unshift(item);
          console.warn(`⚠️  Sync operation ${item.id} failed, retrying (${item.retries}/${this.maxRetries})`);
        } else {
          console.error(`❌ Sync operation ${item.id} failed permanently:`, result.reason);
        }
      } else {
        console.log(`✅ Sync operation ${item.id} completed successfully`);
      }
    });

    this.isProcessing = false;
  }

  /**
   * Execute a single sync operation
   */
  private async executeSyncOperation(item: {
    id: string;
    operation: string;
    data: any;
    timestamp: number;
    retries: number;
  }): Promise<void> {
    const { operation, data } = item;

    switch (operation) {
      case 'user_location_update':
        await this.syncUserLocation(data);
        break;
      
      case 'message_status_update':
        await this.syncMessageStatus(data);
        break;
      
      case 'user_activity_log':
        await this.syncUserActivity(data);
        break;
      
      case 'question_interaction':
        await this.syncQuestionInteraction(data);
        break;
        
      case 'subscription_status':
        await this.syncSubscriptionStatus(data);
        break;

      default:
        throw new Error(`Unknown sync operation: ${operation}`);
    }
  }

  /**
   * Synchronize user location data
   */
  private async syncUserLocation(data: {
    userId: string;
    latitude: number;
    longitude: number;
    source: string;
  }): Promise<void> {
    await connectionPoolManager.executeQuery(`
      UPDATE users 
      SET 
        latitude = $2,
        longitude = $3,
        location_source = $4,
        location_updated_at = NOW()
      WHERE id = $1
    `, [data.userId, data.latitude, data.longitude, data.source]);
  }

  /**
   * Synchronize message read status
   */
  private async syncMessageStatus(data: {
    messageId: string;
    status: string;
    userId: string;
  }): Promise<void> {
    await connectionPoolManager.executeQuery(`
      UPDATE chat_messages 
      SET 
        status = $2,
        read_at = CASE WHEN $2 = 'read' THEN NOW() ELSE read_at END,
        updated_at = NOW()
      WHERE id = $1 AND (sender_id = $3 OR receiver_id = $3)
    `, [data.messageId, data.status, data.userId]);
  }

  /**
   * Synchronize user activity logs
   */
  private async syncUserActivity(data: {
    userId: string;
    activity: string;
    metadata?: any;
  }): Promise<void> {
    await connectionPoolManager.executeQuery(`
      INSERT INTO user_activity_logs (user_id, activity, metadata, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT DO NOTHING
    `, [data.userId, data.activity, JSON.stringify(data.metadata || {})]);
  }

  /**
   * Synchronize question interactions
   */
  private async syncQuestionInteraction(data: {
    userId: string;
    questionId: string;
    interaction: string;
  }): Promise<void> {
    await connectionPoolManager.executeQuery(`
      INSERT INTO question_interactions (user_id, question_id, interaction_type, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, question_id, interaction_type) 
      DO UPDATE SET updated_at = NOW()
    `, [data.userId, data.questionId, data.interaction]);
  }

  /**
   * Synchronize subscription status
   */
  private async syncSubscriptionStatus(data: {
    userId: string;
    subscriptionStatus: string;
    planType?: string;
  }): Promise<void> {
    await connectionPoolManager.executeQuery(`
      UPDATE users 
      SET 
        subscription_status = $2,
        subscription_plan = COALESCE($3, subscription_plan),
        subscription_updated_at = NOW()
      WHERE id = $1
    `, [data.userId, data.subscriptionStatus, data.planType]);
  }

  /**
   * Force immediate synchronization
   */
  async forcSync(): Promise<void> {
    console.log('🚀 Force synchronization initiated...');
    await this.processSyncQueue();
  }

  /**
   * Get sync queue status
   */
  getStatus(): {
    queueLength: number;
    isProcessing: boolean;
    lastSync: number;
  } {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing,
      lastSync: Date.now()
    };
  }

  /**
   * Clear sync queue
   */
  clearQueue(): void {
    const cleared = this.syncQueue.length;
    this.syncQueue = [];
    console.log(`🗑️  Cleared ${cleared} pending sync operations`);
  }
}

// Export singleton instance
export const syncManager = new SyncManager();