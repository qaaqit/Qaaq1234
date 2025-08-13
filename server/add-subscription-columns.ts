import { pool } from './db';
import { promises as fs } from 'fs';

/**
 * MARIANA SAFE COLUMN ADDITION SCRIPT
 * 
 * This script safely adds missing subscription columns to the parent QAAQ database
 * without affecting existing data or breaking compatibility.
 * 
 * MARIANA BASE RULE: No bulk user operations, only schema additions
 * NEVER EVER RULE: No test data will be added, only column structure
 */
async function addSubscriptionColumns() {
  try {
    console.log('🔐 MARIANA SAFE COLUMN ADDITION - QAAQ Parent Database');
    console.log('📋 Adding subscription columns for Razorpay functionality...');
    
    // Read the SQL script
    const sqlScript = await fs.readFile('add-subscription-columns.sql', 'utf-8');
    
    // Execute the safe column addition script
    const result = await pool.query(sqlScript);
    
    console.log('✅ Subscription columns added successfully');
    console.log('📊 Results:', result);
    
    // Test a simple query to ensure everything works
    const testQuery = await pool.query(`
      SELECT COUNT(*) as user_count,
             COUNT(subscription_type) as has_subscription_type,
             COUNT(is_premium) as has_premium_column
      FROM users 
      LIMIT 1
    `);
    
    console.log('🧪 Column test results:', testQuery.rows[0]);
    console.log('✅ MARIANA SUBSCRIPTION COLUMNS READY - Full Razorpay functionality enabled');
    
  } catch (error) {
    console.error('❌ Error adding subscription columns:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export { addSubscriptionColumns };

// Run the script
addSubscriptionColumns().catch(console.error);