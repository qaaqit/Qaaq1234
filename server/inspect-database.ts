import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const userProvidedUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function inspectDatabase() {
  const pool = new Pool({ 
    connectionString: userProvidedUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔍 Inspecting QAAQ Production Database Structure');
    console.log('=' .repeat(80));
    
    // Get all tables with row counts
    const tablesResult = await pool.query(`
      SELECT 
        table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\n📋 Database Tables (${tablesResult.rows.length} total):`);
    console.log('─'.repeat(80));
    
    // Categorize tables
    const qaaqTables = [];
    const systemTables = [];
    const maritimeTables = [];
    const chatTables = [];
    const groupTables = [];
    
    tablesResult.rows.forEach(row => {
      const tableName = row.table_name;
      
      if (tableName.includes('qaaq_') || tableName === 'questions' || tableName === 'answers') {
        qaaqTables.push(tableName);
      } else if (tableName.includes('chat_') || tableName.includes('message')) {
        chatTables.push(tableName);
      } else if (tableName.includes('group') || tableName.includes('cpss_') || tableName.includes('rank_')) {
        groupTables.push(tableName);
      } else if (tableName.includes('machine') || tableName.includes('equipment') || tableName.includes('sailing')) {
        maritimeTables.push(tableName);
      } else {
        systemTables.push(tableName);
      }
    });
    
    if (qaaqTables.length > 0) {
      console.log('\n🤖 Q&A System Tables:');
      qaaqTables.forEach(table => console.log(`  • ${table}`));
    }
    
    if (chatTables.length > 0) {
      console.log('\n💬 Chat & Messaging Tables:');
      chatTables.forEach(table => console.log(`  • ${table}`));
    }
    
    if (groupTables.length > 0) {
      console.log('\n👥 Group & Community Tables:');
      groupTables.forEach(table => console.log(`  • ${table}`));
    }
    
    if (maritimeTables.length > 0) {
      console.log('\n⚓ Maritime & Equipment Tables:');
      maritimeTables.forEach(table => console.log(`  • ${table}`));
    }
    
    if (systemTables.length > 0) {
      console.log('\n⚙️  System & User Management Tables:');
      systemTables.forEach(table => console.log(`  • ${table}`));
    }
    
    // Get user stats
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN whatsapp_number IS NOT NULL THEN 1 END) as users_with_whatsapp,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as users_with_names,
        COUNT(CASE WHEN current_latitude IS NOT NULL THEN 1 END) as users_with_location
      FROM users;
    `);
    
    console.log('\n👤 User Statistics:');
    console.log('─'.repeat(40));
    const stats = userStats.rows[0];
    console.log(`  Total Users:           ${stats.total_users}`);
    console.log(`  With WhatsApp:         ${stats.users_with_whatsapp}`);
    console.log(`  With Names:            ${stats.users_with_names}`);
    console.log(`  With Location:         ${stats.users_with_location}`);
    
    // User table schema
    const userColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Users Table Schema:');
    console.log('─'.repeat(60));
    console.log('Column Name                     Type            Nullable');
    console.log('─'.repeat(60));
    
    userColumns.rows.forEach(col => {
      const name = col.column_name.padEnd(30);
      const type = col.data_type.padEnd(15);
      const nullable = col.is_nullable;
      console.log(`${name} ${type} ${nullable}`);
    });
    
    // Sample user data with actual columns
    const sampleUsers = await pool.query(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        whatsapp_number, 
        city,
        current_ship_name,
        maritime_rank,
        CASE 
          WHEN question_count IS NOT NULL THEN question_count 
          ELSE 0 
        END as q_count
      FROM users 
      WHERE first_name IS NOT NULL AND first_name != ''
      ORDER BY 
        CASE 
          WHEN question_count IS NOT NULL THEN question_count 
          ELSE 0 
        END DESC
      LIMIT 10;
    `);
    
    console.log('\n🏆 Top Maritime Professionals:');
    console.log('─'.repeat(90));
    console.log('Name                    WhatsApp        City            Rank        Ship                Q');
    console.log('─'.repeat(90));
    
    sampleUsers.rows.forEach(user => {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim().padEnd(20);
      const whatsapp = (user.whatsapp_number || 'N/A').padEnd(15);
      const city = (user.city || 'N/A').padEnd(15);
      const rank = (user.maritime_rank || 'N/A').padEnd(10);
      const ship = (user.current_ship_name || 'N/A').padEnd(15);
      const qCount = user.q_count.toString().padStart(3);
      
      console.log(`${name} ${whatsapp} ${city} ${rank} ${ship} ${qCount}`);
    });
    
    // Database connection info
    console.log('\n🔗 Connection Details:');
    console.log('─'.repeat(40));
    console.log(`  Database: neondb`);
    console.log(`  Host: ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech`);
    console.log(`  Status: Connected to QAAQ Production Database`);
    
    console.log('\n✅ Database inspection complete!');
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
  } finally {
    await pool.end();
  }
}

inspectDatabase();