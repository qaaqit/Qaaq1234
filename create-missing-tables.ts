import { db } from './server/db';

async function createMissingTables() {
  try {
    console.log('Creating missing database tables...');
    
    // Create chat_connections table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id VARCHAR NOT NULL,
        receiver_id VARCHAR NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now(),
        accepted_at TIMESTAMP
      );
    `);

    // Drop and recreate chat_messages table with correct structure
    await db.execute(`DROP TABLE IF EXISTS chat_messages;`);
    await db.execute(`
      CREATE TABLE chat_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        connection_id VARCHAR NOT NULL,
        sender_id VARCHAR NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create user_subscription_status table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_subscription_status (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        subscription_type TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create indexes for performance (skip if tables exist)
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_chat_connections_sender_receiver ON chat_connections(sender_id, receiver_id);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_chat_messages_connection ON chat_messages(connection_id);`);
    } catch (e) {
      console.log('Note: Index creation skipped (may already exist)');
    }

    console.log('✅ All missing tables created successfully');
    
    // Verify tables exist
    const tables = await db.execute(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chat_connections', 'chat_messages', 'user_subscription_status', 'users');
    `);
    
    console.log('📋 Available tables:', tables.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
}

createMissingTables().then(() => process.exit(0));