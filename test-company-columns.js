// Quick script to check database columns for company data
const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.QAAQ_DATABASE_URL });

async function checkCompanyColumns() {
  try {
    console.log('🔍 Checking for company-related columns...');
    
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%company%'
    `);
    
    console.log('Company columns found:', columnsResult.rows);
    
    // Also check for a few sample users to see what data exists
    const sampleResult = await pool.query(`
      SELECT id, full_name, last_company, current_company
      FROM users 
      WHERE question_count > 10
      LIMIT 5
    `);
    
    console.log('Sample users with company data:');
    sampleResult.rows.forEach(user => {
      console.log(`- ${user.full_name}: last_company="${user.last_company}", current_company="${user.current_company}"`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // If last_company doesn't exist, try other possible column names
    try {
      const altResult = await pool.query(`
        SELECT id, full_name, company, current_company, organisation 
        FROM users 
        WHERE question_count > 10
        LIMIT 3
      `);
      
      console.log('Alternative company columns:');
      altResult.rows.forEach(user => {
        console.log(`- ${user.full_name}: company="${user.company}", current_company="${user.current_company}", organisation="${user.organisation}"`);
      });
    } catch (err) {
      console.log('No standard company columns found');
    }
  }
}

checkCompanyColumns();