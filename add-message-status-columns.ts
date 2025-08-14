// Add message status columns to parent QAAQ database
// This script uses the existing database connection to add the required columns

import { pool } from './server/database.ts';

async function addMessageStatusColumns() {
  try {
    console.log('🔧 Adding message status columns to chat_messages table...');
    
    // Add the three new columns for message status
    await pool.query(`
      ALTER TABLE chat_messages 
      ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
    `);
    
    console.log('✅ Message status columns added successfully');
    
    // Update existing messages to have delivered status
    const updateDelivered = await pool.query(`
      UPDATE chat_messages 
      SET is_delivered = true, delivered_at = created_at 
      WHERE is_delivered IS NULL;
    `);
    
    console.log(`📦 Updated ${updateDelivered.rowCount} messages with delivered status`);
    
    // Update read messages to have read_at timestamp  
    const updateRead = await pool.query(`
      UPDATE chat_messages 
      SET read_at = created_at 
      WHERE is_read = true AND read_at IS NULL;
    `);
    
    console.log(`📖 Updated ${updateRead.rowCount} read messages with read timestamps`);
    
    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_is_delivered ON chat_messages(is_delivered);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_delivered_at ON chat_messages(delivered_at);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);
    `);
    
    console.log('🔍 Created performance indexes');
    
    // Verify the columns were added
    const verification = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'chat_messages' 
      AND column_name IN ('is_delivered', 'delivered_at', 'read_at')
      ORDER BY column_name;
    `);
    
    console.log('✅ Verification - New columns:');
    verification.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    console.log('🎉 Message status columns setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding message status columns:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
addMessageStatusColumns();