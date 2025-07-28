import { Pool } from '@neondatabase/serverless';

// Direct test of database connection
const testPool = new Pool({ 
  connectionString: process.env.QAAQ_ADMIN_DATABASE_URL || process.env.DATABASE_URL
});

export async function testDatabaseConnection() {
  try {
    console.log('Testing direct database connection...');
    
    // Test basic connection
    const countResult = await testPool.query('SELECT COUNT(*) as total FROM users');
    console.log('Total users:', countResult.rows[0].total);
    
    // Test schema
    const schemaResult = await testPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);
    console.log('User table columns:', schemaResult.rows);
    
    // Test simple select
    const userResult = await testPool.query('SELECT id, email FROM users LIMIT 1');
    console.log('Sample user:', userResult.rows[0]);
    
    return true;
  } catch (error) {
    console.error('Database test failed:', error);
    return false;
  }
}