import { pool } from "./db";
import fs from "fs/promises";
import path from "path";

async function storeBotRules() {
  let client;
  try {
    console.log("Reading QBOTRULESV1.md file...");
    const content = await fs.readFile(
      path.join(process.cwd(), "QBOTRULESV1.md"),
      "utf-8"
    );
    
    client = await pool.connect();
    
    // First, let's create a simple key-value storage table for bot documentation
    console.log("Creating bot_documentation table if not exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_documentation (
        id SERIAL PRIMARY KEY,
        doc_key VARCHAR(255) UNIQUE NOT NULL,
        doc_value TEXT NOT NULL,
        doc_type VARCHAR(100) DEFAULT 'rules',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Insert or update the QBOT rules
    console.log("Storing QBOT rules...");
    const result = await client.query(`
      INSERT INTO bot_documentation (doc_key, doc_value, doc_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (doc_key) 
      DO UPDATE SET 
        doc_value = EXCLUDED.doc_value,
        updated_at = NOW()
      RETURNING *;
    `, ['QBOTRULESV1', content, 'rules']);
    
    console.log("✅ QBOT rules successfully stored in bot_documentation table!");
    
    if (result.rows.length > 0) {
      const doc = result.rows[0];
      console.log("\nStored documentation:");
      console.log("- Key:", doc.doc_key);
      console.log("- Type:", doc.doc_type);
      console.log("- Content length:", doc.doc_value.length, "characters");
      console.log("- Created at:", doc.created_at);
      console.log("- Updated at:", doc.updated_at);
      
      // Also display first few lines
      const preview = doc.doc_value.split('\n').slice(0, 5).join('\n');
      console.log("\nContent preview:");
      console.log(preview);
      console.log("...");
    }
    
    // Verify access for sister apps
    console.log("\n📢 Bot rules are now available for all QAAQ sister apps!");
    console.log("Sister apps can retrieve using: SELECT doc_value FROM bot_documentation WHERE doc_key = 'QBOTRULESV1'");
    
    process.exit(0);
  } catch (error) {
    console.error("Error storing bot rules:", error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

storeBotRules();