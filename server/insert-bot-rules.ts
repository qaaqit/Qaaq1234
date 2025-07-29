import { db } from "./db";
import { botRules } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

async function insertBotRules() {
  try {
    console.log("Reading QBOTRULESV1.md file...");
    const qbotRulesContent = await fs.readFile(
      path.join(process.cwd(), "QBOTRULESV1.md"),
      "utf-8"
    );

    console.log("Inserting QBOT rules into database...");
    
    // Insert directly without checking existence
    try {
      await db.insert(botRules).values({
        name: "QBOTRULESV1",
        version: "1.0",
        content: qbotRulesContent,
        category: "QBOT",
        status: "active",
      });
      console.log("✅ QBOT rules successfully stored in database!");
    } catch (insertError: any) {
      if (insertError.code === '23505') { // Unique constraint violation
        console.log("QBOT rules already exist. Updating...");
        await db
          .update(botRules)
          .set({
            content: qbotRulesContent,
            version: "1.0",
            updatedAt: new Date(),
          })
          .where(eq(botRules.name, "QBOTRULESV1"));
        console.log("✅ QBOT rules successfully updated in database!");
      } else {
        throw insertError;
      }
    }
    
    // Verify the insertion
    console.log("\nVerifying stored bot rule...");
    const result = await db.select().from(botRules);
    const qbotRule = result.find(rule => rule.name === "QBOTRULESV1");
    
    if (qbotRule) {
      console.log("\nStored bot rule:");
      console.log("- Name:", qbotRule.name);
      console.log("- Version:", qbotRule.version);
      console.log("- Category:", qbotRule.category);
      console.log("- Status:", qbotRule.status);
      console.log("- Content length:", qbotRule.content.length, "characters");
      console.log("- Created at:", qbotRule.createdAt);
      console.log("- Updated at:", qbotRule.updatedAt);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error inserting bot rules:", error);
    process.exit(1);
  }
}

insertBotRules();