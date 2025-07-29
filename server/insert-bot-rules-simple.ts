import { pool } from "./db";
import fs from "fs/promises";
import path from "path";

async function insertBotRulesSimple() {
  let client;
  try {
    console.log("Reading QBOTRULESV1.md file...");
    const qbotRulesContent = await fs.readFile(
      path.join(process.cwd(), "QBOTRULESV1.md"),
      "utf-8"
    );

    console.log("Getting database client...");
    client = await pool.connect();
    
    // First check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bot_rules'
      );
    `);
    
    console.log("Table exists:", tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log("Creating bot_rules table...");
      await client.query(`
        CREATE TABLE IF NOT EXISTS bot_rules (
          id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          version VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          category VARCHAR(100) NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by VARCHAR REFERENCES users(id)
        );
      `);
    }
    
    console.log("Inserting QBOT rules...");
    const result = await client.query(
      `INSERT INTO bot_rules (name, version, content, category, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) 
       DO UPDATE SET 
         content = EXCLUDED.content,
         version = EXCLUDED.version,
         updated_at = NOW()
       RETURNING *;`,
      ["QBOTRULESV1", "1.0", qbotRulesContent, "QBOT", "active"]
    );
    
    console.log("✅ QBOT rules successfully stored in database!");
    
    const insertedRule = result.rows[0];
    console.log("\nStored bot rule:");
    console.log("- ID:", insertedRule.id);
    console.log("- Name:", insertedRule.name);
    console.log("- Version:", insertedRule.version);
    console.log("- Category:", insertedRule.category);
    console.log("- Status:", insertedRule.status);
    console.log("- Content length:", insertedRule.content.length, "characters");
    console.log("- Created at:", insertedRule.created_at);
    
    process.exit(0);
  } catch (error) {
    console.error("Error inserting bot rules:", error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

insertBotRulesSimple();