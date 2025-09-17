// Database migration to add serial_number and port columns to rfq_requests table

import { pool } from "./server/db";

async function addRfqSerialColumns() {
  console.log("🔄 Starting migration: Adding serial_number and port columns to rfq_requests");
  
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Add port column if it doesn't exist
    await pool.query(`
      ALTER TABLE rfq_requests 
      ADD COLUMN IF NOT EXISTS port TEXT
    `);
    console.log("✅ Added port column");
    
    // Add serial_number column if it doesn't exist
    await pool.query(`
      ALTER TABLE rfq_requests 
      ADD COLUMN IF NOT EXISTS serial_number INTEGER
    `);
    console.log("✅ Added serial_number column");
    
    // Populate port column with normalized location
    await pool.query(`
      UPDATE rfq_requests 
      SET port = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(location, '[^a-zA-Z0-9 -]', '', 'g'), '[ ]+', '-', 'g'))
      WHERE port IS NULL
    `);
    console.log("✅ Populated port column with normalized locations");
    
    // Calculate and populate serial_number for each port
    await pool.query(`
      WITH serial_assignments AS (
        SELECT 
          id,
          port,
          ROW_NUMBER() OVER (PARTITION BY port ORDER BY created_at, id) AS new_serial
        FROM rfq_requests
        WHERE port IS NOT NULL
      )
      UPDATE rfq_requests r
      SET serial_number = s.new_serial
      FROM serial_assignments s
      WHERE r.id = s.id AND r.serial_number IS NULL
    `);
    console.log("✅ Populated serial_number column");
    
    // Create index on port and serial_number for fast lookups
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rfq_port_serial 
      ON rfq_requests(port, serial_number) 
      WHERE port IS NOT NULL AND serial_number IS NOT NULL
    `);
    console.log("✅ Created unique index on port and serial_number");
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log("🎉 Migration completed successfully!");
    
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
addRfqSerialColumns()
  .then(() => {
    console.log("✅ Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  });