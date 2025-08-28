const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // Check tables
    const result = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log('Tables in local database:', result.rows.map(r => r.tablename).join(', '));
    
    // Check sessions count
    try {
      const sessions = await client.query("SELECT COUNT(*) FROM sessions");
      console.log('Sessions table:', sessions.rows[0].count, 'records');
    } catch(e) {}
    
    // Check user_answers count  
    try {
      const ua = await client.query("SELECT COUNT(*) FROM user_answers");
      console.log('User_answers table:', ua.rows[0].count, 'records');
    } catch(e) {}
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

check();
