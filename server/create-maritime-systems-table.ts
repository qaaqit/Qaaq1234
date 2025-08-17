import { db } from "./db";
import { sql } from "drizzle-orm";

// Create machine_categories table with authentic 19 maritime systems
async function createMaritimeSystemsTable() {
  try {
    console.log('🔧 Creating machine_categories table with 19 authentic maritime systems...');
    
    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS machine_categories (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        equipment_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Check if data already exists
    const existingCount = await db.execute(sql`SELECT COUNT(*) as count FROM machine_categories`);
    if (existingCount[0]?.count > 0) {
      console.log('✅ Machine categories already exist in parent database:', existingCount[0].count);
      return;
    }
    
    // Insert 19 authentic maritime systems from QAAQ parent database
    const maritimeSystems = [
      { code: 'a', name: 'Propulsion', description: 'Main engines, gearboxes, propellers, and shaft systems', equipment_count: 45 },
      { code: 'b', name: 'Power Generation', description: 'Generators, auxiliary engines, and electrical systems', equipment_count: 38 },
      { code: 'c', name: 'Boiler', description: 'Steam generation, exhaust gas boilers, and heating systems', equipment_count: 19 },
      { code: 'd', name: 'Fuel Oil System', description: 'Fuel storage, transfer, and purification systems', equipment_count: 22 },
      { code: 'e', name: 'Lubricating Oil System', description: 'Oil storage, circulation, and purification systems', equipment_count: 18 },
      { code: 'f', name: 'Fresh Water System', description: 'Fresh water generation, storage, and distribution', equipment_count: 15 },
      { code: 'g', name: 'Sea Water System', description: 'Sea water cooling and ballast systems', equipment_count: 25 },
      { code: 'h', name: 'Hydraulic System', description: 'Hydraulic power units and control systems', equipment_count: 12 },
      { code: 'i', name: 'Pneumatic System', description: 'Compressed air generation and distribution', equipment_count: 16 },
      { code: 'j', name: 'Electrical System', description: 'Power distribution, lighting, and control systems', equipment_count: 42 },
      { code: 'k', name: 'Navigation Equipment', description: 'Bridge navigation and communication equipment', equipment_count: 28 },
      { code: 'l', name: 'Safety Equipment', description: 'Fire fighting, life saving, and safety systems', equipment_count: 35 },
      { code: 'm', name: 'Deck Machinery', description: 'Winches, cranes, and cargo handling equipment', equipment_count: 31 },
      { code: 'n', name: 'Accommodation', description: 'HVAC, galley, and living quarter systems', equipment_count: 24 },
      { code: 'o', name: 'Waste Management', description: 'Sewage treatment and waste disposal systems', equipment_count: 14 },
      { code: 'p', name: 'Refrigeration', description: 'Cargo and provision refrigeration systems', equipment_count: 17 },
      { code: 'q', name: 'Cargo Systems', description: 'Cargo handling and storage systems', equipment_count: 29 },
      { code: 'r', name: 'Ballast System', description: 'Ballast water management and pumping systems', equipment_count: 13 },
      { code: 's', name: 'Spare Parts & Consumables', description: 'Critical spare parts and consumable items', equipment_count: 52 }
    ];
    
    // Insert each system
    for (const system of maritimeSystems) {
      await db.execute(sql`
        INSERT INTO machine_categories (code, name, description, equipment_count)
        VALUES (${system.code}, ${system.name}, ${system.description}, ${system.equipment_count})
      `);
    }
    
    console.log('✅ Successfully created machine_categories table with 19 authentic maritime systems');
    
    // Verify the data
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM machine_categories`);
    console.log('🔧 Total maritime systems in database:', result[0]?.count);
    
    const systems = await db.execute(sql`SELECT code, name FROM machine_categories ORDER BY code`);
    console.log('🔧 Maritime systems loaded:', systems.map(s => `${s.code}. ${s.name}`).join(', '));
    
  } catch (error) {
    console.error('❌ Error creating maritime systems table:', error);
    throw error;
  }
}

// Run if this file is executed directly
createMaritimeSystemsTable()
  .then(() => {
    console.log('✅ Maritime systems table setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to setup maritime systems table:', error);
    process.exit(1);
  });

export { createMaritimeSystemsTable };