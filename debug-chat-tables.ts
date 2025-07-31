import { pool } from './server/db.js';

async function debugChatTables() {
  try {
    console.log('Checking chat tables...');
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%chat%'
    `);
    
    console.log('Chat tables found:', tablesResult.rows);
    
    if (tablesResult.rows.length === 0) {
      console.log('Creating chat tables...');
      
      // Create chat_connections table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_connections (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id VARCHAR NOT NULL,
          receiver_id VARCHAR NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          accepted_at TIMESTAMP
        );
      `);
      
      // Create chat_messages table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          connection_id VARCHAR NOT NULL,
          sender_id VARCHAR NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('Chat tables created!');
    } else {
      console.log('Chat tables already exist');
      
      // Check table structure
      for (const table of tablesResult.rows) {
        const columns = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        console.log(`\nTable ${table.table_name} columns:`, columns.rows);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugChatTables();