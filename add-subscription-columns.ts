import { neon } from '@neondatabase/serverless';

async function addSubscriptionColumns() {
  try {
    console.log('🔧 Adding missing subscription columns...');
    
    const sql = neon(process.env.DATABASE_URL!);
    
    // Add is_premium column if not exists
    await sql(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE
    `);
    
    // Add premium_expires_at column if not exists  
    await sql(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP
    `);
    
    // Add subscription_id column if not exists
    await sql(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT
    `);
    
    // Add subscription_type column if not exists
    await sql(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type TEXT
    `);
    
    console.log('✅ Subscription columns added successfully');
    
    // Verify the columns exist
    const result = await sql(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('is_premium', 'premium_expires_at', 'subscription_id', 'subscription_type')
    `);
    
    console.log('📋 Available subscription columns:', result.map(r => r.column_name));
    
  } catch (error) {
    console.error('❌ Error adding subscription columns:', error);
  } finally {
    process.exit(0);
  }
}

addSubscriptionColumns();