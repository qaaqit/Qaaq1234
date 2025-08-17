import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkMaritimeCategories() {
  try {
    console.log('🔧 Checking machine_categories table structure...');
    
    // Check table structure
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'machine_categories' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table columns:', columns);
    
    // Get all data from machine_categories
    const categoriesResult = await db.execute(sql`SELECT * FROM machine_categories ORDER BY id LIMIT 20`);
    const categories = categoriesResult.rows || categoriesResult;
    console.log('📊 Found', categories.length, 'maritime categories');
    console.log('🔧 Sample data:', categories.slice(0, 5));
    
    return categories;
    
  } catch (error) {
    console.error('❌ Error checking maritime categories:', error);
    throw error;
  }
}

checkMaritimeCategories()
  .then((data) => {
    console.log('✅ Maritime categories check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to check maritime categories:', error);
    process.exit(1);
  });