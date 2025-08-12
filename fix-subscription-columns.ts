import { storage } from './server/storage';

async function addSubscriptionColumns() {
  try {
    console.log('🔧 Adding missing subscription columns via storage...');
    
    // Use the existing database connection to add columns
    const db = (storage as any).db;
    
    if (!db) {
      console.error('❌ No database connection found');
      return;
    }

    // Add missing columns
    const alterQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type TEXT'
    ];

    for (const query of alterQueries) {
      try {
        await db.execute(query);
        console.log('✅ Executed:', query.substring(0, 50) + '...');
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error with query:', query, error.message);
        }
      }
    }

    console.log('✅ Subscription columns setup complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addSubscriptionColumns();