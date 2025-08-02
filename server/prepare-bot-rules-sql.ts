import fs from "fs/promises";
import path from "path";

async function prepareBotRulesSQL() {
  try {
    const content = await fs.readFile(
      path.join(process.cwd(), "QBOTRULESV1.md"),
      "utf-8"
    );
    
    // Escape single quotes for SQL
    const escapedContent = content.replace(/'/g, "''");
    
    // Create SQL statement
    const sql = `
INSERT INTO bot_rules ("name", "version", "content", "category", "status")
VALUES ('QBOTRULESV1', '1.0', '${escapedContent}', 'QBOT', 'active')
ON CONFLICT ("name") 
DO UPDATE SET 
  "content" = EXCLUDED."content",
  "version" = EXCLUDED."version",
  "updated_at" = NOW();
`;
    
    await fs.writeFile("/tmp/insert_bot_rules.sql", sql);
    console.log("SQL file prepared at /tmp/insert_bot_rules.sql");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

prepareBotRulesSQL();