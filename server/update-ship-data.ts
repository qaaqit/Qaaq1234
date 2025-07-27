import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const shipUpdates = [
  { email: "captain.miller@qaaq.com", shipName: "MV SINGAPORE STAR", imoNumber: "9876543" },
  { email: "chief.chen@qaaq.com", shipName: "MV ROTTERDAM EXPRESS", imoNumber: "9765432" },
  { email: "officer.rodriguez@qaaq.com", shipName: "MV PANAMA BRIDGE", imoNumber: "9654321" },
  { email: "bosun.hassan@qaaq.com", shipName: "MV DUBAI PEARL", imoNumber: "9543210" },
  { email: "captain.li@qaaq.com", shipName: "MV SHANGHAI DRAGON", imoNumber: "9432109" },
  { email: "chief.olsen@qaaq.com", shipName: "MV HAMBURG TRADER", imoNumber: "9321098" },
  { email: "engineer.patel@qaaq.com", shipName: "MV MUMBAI QUEEN", imoNumber: "9210987" }
];

async function updateShipData() {
  console.log("Starting to update ship data...");
  
  try {
    for (const update of shipUpdates) {
      await db
        .update(users)
        .set({ 
          shipName: update.shipName,
          imoNumber: update.imoNumber
        })
        .where(eq(users.email, update.email));
      console.log(`Updated ship data for ${update.email}: ${update.shipName} (IMO: ${update.imoNumber})`);
    }
    
    console.log("Ship data updates completed successfully!");
  } catch (error) {
    console.error("Error updating ship data:", error);
  }
}

// Run the update function
updateShipData().then(() => process.exit(0));