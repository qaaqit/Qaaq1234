import { db } from './server/db';

async function checkUsersSchema() {
  try {
    console.log('🔍 Checking users table schema...');
    
    const usersSchema = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Users table columns:');
    usersSchema.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n🔍 Checking bhangar_users table schema...');
    
    const bhangarSchema = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bhangar_users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Bhangar_users table columns:');
    bhangarSchema.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check for ship-related columns specifically
    const shipColumns = usersSchema.rows.filter(col => 
      col.column_name.toLowerCase().includes('ship') || 
      col.column_name.toLowerCase().includes('vessel') ||
      col.column_name.toLowerCase().includes('imo') ||
      col.column_name.toLowerCase().includes('onboard')
    );
    
    console.log('\n🚢 Ship-related columns in users table:');
    if (shipColumns.length > 0) {
      shipColumns.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('- No ship-related columns found in users table');
    }
    
    const bhangarShipColumns = bhangarSchema.rows.filter(col => 
      col.column_name.toLowerCase().includes('ship') || 
      col.column_name.toLowerCase().includes('vessel') ||
      col.column_name.toLowerCase().includes('imo') ||
      col.column_name.toLowerCase().includes('onboard')
    );
    
    console.log('\n🚢 Ship-related columns in bhangar_users table:');
    if (bhangarShipColumns.length > 0) {
      bhangarShipColumns.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('- No ship-related columns found in bhangar_users table');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkUsersSchema().then(() => process.exit(0));