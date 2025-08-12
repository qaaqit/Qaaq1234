// Fix remaining missing database columns for chat system
import { pool } from "./server/db";

async function addMissingChatColumns() {
  console.log('🔧 Adding remaining missing chat columns...');
  
  try {
    // Check and add missing columns to chat_messages table
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chat_messages'
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('Existing chat_messages columns:', existingColumns);
    
    const requiredColumns = [
      { name: 'sender_id', type: 'VARCHAR' },
      { name: 'message', type: 'TEXT' },
      { name: 'is_read', type: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' }
    ];
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding missing ${column.name} column to chat_messages...`);
        await pool.query(`
          ALTER TABLE chat_messages 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ Added ${column.name} column`);
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }
    
    console.log('🎉 Chat columns fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding chat columns:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fixes
addMissingChatColumns().catch(console.error);