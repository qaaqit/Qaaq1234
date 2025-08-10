import { db } from "./server/db";
import { users } from "./shared/schema";
import { sql } from "drizzle-orm";

async function checkUsersSchema() {
  console.log('🔍 Checking users table schema and sample data...');
  
  try {
    // Get table schema
    const schemaQuery = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Users table columns:');
    schemaQuery.rows.forEach((row: any) => {
      console.log(`  • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Get sample users with WhatsApp numbers
    const sampleUsers = await db
      .select()
      .from(users)
      .where(sql`whatsapp_number IS NOT NULL AND whatsapp_number != ''`)
      .limit(10);
    
    console.log(`\n👥 Found ${sampleUsers.length} users with WhatsApp numbers (showing first 10):`);
    sampleUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.fullName} - WhatsApp: ${user.whatsAppNumber} - Email: ${user.email}`);
    });
    
    // Count total users
    const totalCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const totalWithWhatsApp = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''`);
    
    console.log(`\n📊 User Statistics:`);
    console.log(`   • Total users: ${totalCount.rows[0].count}`);
    console.log(`   • Users with WhatsApp: ${totalWithWhatsApp.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    throw error;
  }
}

checkUsersSchema()
  .then(() => {
    console.log('✅ Schema check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });