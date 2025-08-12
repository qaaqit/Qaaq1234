// Manual database fix for subscription columns
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function fixDatabase() {
  try {
    console.log('🔧 Running manual database fix...');
    
    // Add columns
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE`;
    console.log('✅ Added is_premium column');
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP`;
    console.log('✅ Added premium_expires_at column');
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT`;
    console.log('✅ Added subscription_id column');
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type TEXT`;
    console.log('✅ Added subscription_type column');
    
    console.log('🎉 Database fix complete!');
  } catch (error) {
    console.error('❌ Database fix error:', error);
  }
}

fixDatabase();