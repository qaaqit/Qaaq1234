import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const portUpdates = [
  { email: "captain.miller@qaaq.com", port: "Singapore", visitWindow: "28 to 30 Jul25" },
  { email: "chief.chen@qaaq.com", port: "Rotterdam", visitWindow: "2 to 5 Aug25" },
  { email: "officer.rodriguez@qaaq.com", port: "Panama City", visitWindow: "15 to 18 Aug25" },
  { email: "bosun.hassan@qaaq.com", port: "Dubai", visitWindow: "22 to 25 Aug25" },
  { email: "captain.li@qaaq.com", port: "Shanghai", visitWindow: "1 to 4 Sep25" },
  { email: "chief.olsen@qaaq.com", port: "Hamburg", visitWindow: "8 to 11 Sep25" },
  { email: "engineer.patel@qaaq.com", port: "Mumbai", visitWindow: "20 to 23 Sep25" }
];

async function updatePortData() {
  console.log("Starting to update port and visit window data...");
  
  try {
    for (const update of portUpdates) {
      await db
        .update(users)
        .set({ 
          port: update.port,
          visitWindow: update.visitWindow
        })
        .where(eq(users.email, update.email));
      console.log(`Updated port data for ${update.email}: ${update.port} (${update.visitWindow})`);
    }
    
    console.log("Port data updates completed successfully!");
  } catch (error) {
    console.error("Error updating port data:", error);
  }
}

// Run the update function
updatePortData().then(() => process.exit(0));