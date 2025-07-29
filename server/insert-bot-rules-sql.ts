import { pool } from "./db";
import fs from "fs/promises";
import path from "path";

async function insertBotRulesSQL() {
  try {
    console.log("Reading QBOTRULESV1.md file...");
    const qbotRulesContent = await fs.readFile(
      path.join(process.cwd(), "QBOTRULESV1.md"),
      "utf-8"
    );

    console.log("Inserting QBOT rules into database using SQL...");
    
    const query = `
      INSERT INTO bot_rules (name, version, content, category, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) 
      DO UPDATE SET 
        content = EXCLUDED.content,
        version = EXCLUDED.version,
        updated_at = NOW()
      RETURNING *;
    `;
    
    const values = [
      "QBOTRULESV1",
      "1.0",
      qbotRulesContent,
      "QBOT",
      "active"
    ];
    
    const result = await pool.query(query, values);
    
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
    console.log("- Updated at:", insertedRule.updated_at);
    
    process.exit(0);
  } catch (error) {
    console.error("Error inserting bot rules:", error);
    process.exit(1);
  }
}

insertBotRulesSQL();