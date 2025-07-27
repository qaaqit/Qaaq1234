import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const shipNameUpdates = [
  { email: "captain.miller@qaaq.com", newShipName: "MV Singapore Star" },
  { email: "chief.chen@qaaq.com", newShipName: "MV Rotterdam Express" },
  { email: "officer.rodriguez@qaaq.com", newShipName: "MV Panama Bridge" },
  { email: "bosun.hassan@qaaq.com", newShipName: "MV Dubai Pearl" },
  { email: "captain.li@qaaq.com", newShipName: "MV Shanghai Dragon" },
  { email: "chief.olsen@qaaq.com", newShipName: "MV Hamburg Trader" },
  { email: "engineer.patel@qaaq.com", newShipName: "MV Mumbai Queen" }
];

async function updateShipNamesCase() {
  console.log("Starting to update ship names to proper case...");
  
  try {
    for (const update of shipNameUpdates) {
      await db
        .update(users)
        .set({ shipName: update.newShipName })
        .where(eq(users.email, update.email));
      console.log(`Updated ship name for ${update.email}: ${update.newShipName}`);
    }
    
    console.log("Ship name case updates completed successfully!");
  } catch (error) {
    console.error("Error updating ship names:", error);
  }
}

// Run the update function
updateShipNamesCase().then(() => process.exit(0));