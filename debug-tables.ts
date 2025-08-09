import { pool } from "./server/db.js";

async function checkTables() {
  try {
    console.log("Checking available tables...");
    
    // Check all tables with file/upload/attachment in name
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%file%' OR table_name LIKE '%upload%' OR table_name LIKE '%attachment%')
    `);
    
    console.log("Tables found:", tablesResult.rows);
    
    // Check if file_uploads table exists
    const fileUploadsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'file_uploads'
      )
    `);
    
    console.log("file_uploads table exists:", fileUploadsCheck.rows[0].exists);
    
    if (fileUploadsCheck.rows[0].exists) {
      // Get file_uploads structure and count
      const structure = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'file_uploads'
      `);
      console.log("file_uploads structure:", structure.rows);
      
      const count = await pool.query('SELECT COUNT(*) FROM file_uploads');
      console.log("file_uploads count:", count.rows[0].count);
      
      // Get sample records
      const sample = await pool.query('SELECT * FROM file_uploads LIMIT 5');
      console.log("Sample file_uploads records:", sample.rows);
    }
    
    // Also check question_attachments
    const qaCount = await pool.query('SELECT COUNT(*) FROM question_attachments WHERE attachment_type = \'image\'');
    console.log("question_attachments image count:", qaCount.rows[0].count);
    
  } catch (error) {
    console.error("Error checking tables:", error);
  } finally {
    process.exit(0);
  }
}

checkTables();