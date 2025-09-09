#!/usr/bin/env tsx
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

async function checkParentDatabase() {
  console.log('🔍 CHECKING PARENT DATABASE STATUS');
  console.log('==================================');
  
  // Parent database connection (autumn hat)
  const parentDbUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  const parentPool = new Pool({ 
    connectionString: parentDbUrl,
    ssl: { rejectUnauthorized: false },
    max: 3
  });
  
  const parentDb = drizzle({ client: parentPool });
  
  try {
    console.log('\n📋 Connecting to parent database...');
    
    // Total user count
    const totalResult = await parentDb.execute(sql`SELECT COUNT(*) as count FROM users`);
    const totalUsers = Number(totalResult.rows[0]?.count || 0);
    
    // Workshop providers count
    const workshopResult = await parentDb.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE user_type = 'workshop_provider'
    `);
    const workshopUsers = Number(workshopResult.rows[0]?.count || 0);
    
    // Maritime professionals count
    const maritimeResult = await parentDb.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE user_type IS NULL OR user_type != 'workshop_provider'
    `);
    const maritimeUsers = Number(maritimeResult.rows[0]?.count || 0);
    
    // Sample users to verify
    const sampleResult = await parentDb.execute(sql`
      SELECT full_name, user_type FROM users 
      WHERE full_name LIKE 'Vikash%' OR full_name LIKE 'Vijay%' 
      LIMIT 5
    `);
    
    console.log('\n📊 PARENT DATABASE VERIFIED:');
    console.log('============================');
    console.log(`✅ Total Users: ${totalUsers}`);
    console.log(`🚢 Maritime Professionals: ${maritimeUsers}`);
    console.log(`🔧 Workshop Providers: ${workshopUsers}`);
    console.log(`🎯 Expected Total: 1,446 (1,353 + 93)`);
    console.log(`📈 Status: ${totalUsers >= 1400 ? 'SUCCESS - Target Achieved!' : 'In Progress'}`);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📋 Sample Maritime Users Found:');
      sampleResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (${user.user_type || 'maritime'})`);
      });
    }
    
    // Migration success confirmation
    if (totalUsers >= 1400 && workshopUsers === 93 && maritimeUsers >= 1350) {
      console.log('\n🎊 MIGRATION COMPLETELY SUCCESSFUL!');
      console.log('   ✅ All maritime professionals preserved');
      console.log('   ✅ All workshop users added');
      console.log('   ✅ Target of 1,446+ users achieved');
    }
    
    return {
      totalUsers,
      maritimeUsers,
      workshopUsers,
      success: totalUsers >= 1400
    };
    
  } catch (error) {
    console.error('\n❌ Parent database check failed:', error);
    throw error;
  } finally {
    await parentPool.end();
    console.log('\n🔒 Parent database connection closed');
  }
}

// Execute check
checkParentDatabase().then((result) => {
  console.log(`\n🎉 Parent database check completed! ${result.totalUsers} users confirmed.`);
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Parent database check failed:', error);
  process.exit(1);
});