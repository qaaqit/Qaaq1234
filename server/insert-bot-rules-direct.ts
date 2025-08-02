import { pool } from "./db";
import fs from "fs/promises";
import path from "path";

async function insertBotRulesDirect() {
  let client;
  try {
    console.log("Reading QBOTRULESV1.md file...");
    const content = await fs.readFile(
      path.join(process.cwd(), "QBOTRULESV1.md"),
      "utf-8"
    );
    
    console.log("Content length:", content.length, "characters");
    
    // Connect to database with explicit schema
    client = await pool.connect();
    
    // Set search path explicitly
    await client.query('SET search_path TO public');
    
    // Try with quoted identifiers
    const insertQuery = `
      INSERT INTO public."bot_rules" ("name", "version", "content", "category", "status")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("name") 
      DO UPDATE SET 
        "content" = EXCLUDED."content",
        "version" = EXCLUDED."version",
        "updated_at" = NOW()
      RETURNING *;
    `;
    
    console.log("Executing insert query...");
    const result = await client.query(insertQuery, [
      'QBOTRULESV1',
      '1.0',
      content,
      'QBOT',
      'active'
    ]);
    
    console.log("✅ QBOT rules successfully stored in database!");
    
    if (result.rows.length > 0) {
      const rule = result.rows[0];
      console.log("\nStored bot rule:");
      console.log("- ID:", rule.id);
      console.log("- Name:", rule.name);
      console.log("- Version:", rule.version);
      console.log("- Category:", rule.category);
      console.log("- Status:", rule.status);
      console.log("- Content preview:", rule.content.substring(0, 100) + "...");
      console.log("- Created at:", rule.created_at);
    }
    
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

insertBotRulesDirect();