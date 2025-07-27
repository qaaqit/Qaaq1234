import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const nameUpdates = [
  { email: "captain.miller@qaaq.com", newName: "James Miller" },
  { email: "chief.chen@qaaq.com", newName: "Sarah Chen" },
  { email: "officer.rodriguez@qaaq.com", newName: "Marco Rodriguez" },
  { email: "bosun.hassan@qaaq.com", newName: "Ahmed Hassan" },
  { email: "captain.li@qaaq.com", newName: "Li Wei" },
  { email: "chief.olsen@qaaq.com", newName: "Olsen" },
  { email: "engineer.patel@qaaq.com", newName: "Patel" },
  { email: "yuki.guide@local.com", newName: "Yuki" }
];

async function updateUserNames() {
  console.log("Starting to update user names...");
  
  try {
    for (const update of nameUpdates) {
      await db
        .update(users)
        .set({ fullName: update.newName })
        .where(eq(users.email, update.email));
      console.log(`Updated name for ${update.email} to ${update.newName}`);
    }
    
    console.log("Name updates completed successfully!");
  } catch (error) {
    console.error("Error updating user names:", error);
  }
}

// Run the update function
updateUserNames().then(() => process.exit(0));