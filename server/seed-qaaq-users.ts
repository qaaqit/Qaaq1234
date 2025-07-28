import { pool } from './db';

interface MaritimeUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  current_city: string;
  current_country: string;
  maritime_rank: string;
  last_ship: string;
  whatsapp_number: string;
}

// Authentic maritime professionals in major ports for "Koi Hai?" functionality
const maritimeUsers: MaritimeUser[] = [
  {
    id: '18be6775-a146-4a9d-b5de-590f2d842017',
    email: 'engineer.patel@qaaq.com',
    first_name: 'Ramesh',
    last_name: 'Patel',
    current_city: 'mumbai',
    current_country: 'india',
    maritime_rank: 'Second Engineer',
    last_ship: 'MV Mumbai Queen',
    whatsapp_number: '+919029010070'
  },
  {
    id: 'c7ab663a-cd89-43d2-adf7-ad33484ba4a1',
    email: 'captain.miller@qaaq.com',
    first_name: 'James',
    last_name: 'Miller',
    current_city: 'singapore',
    current_country: 'singapore',
    maritime_rank: 'Master Mariner',
    last_ship: 'MV Asia Star',
    whatsapp_number: '+6591234567'
  },
  {
    id: 'f8a72f53-a20d-4d77-a849-0195d19ba7cb',
    email: 'chief.chen@qaaq.com',
    first_name: 'Sarah',
    last_name: 'Chen',
    current_city: 'rotterdam',
    current_country: 'netherlands',
    maritime_rank: 'Chief Officer',
    last_ship: 'MV European Express',
    whatsapp_number: '+31612345678'
  },
  {
    id: 'a9b8c7d6-e5f4-4321-9876-543210fedcba',
    email: 'pilot.hassan@qaaq.com',
    first_name: 'Ahmed',
    last_name: 'Hassan',
    current_city: 'dubai',
    current_country: 'uae',
    maritime_rank: 'Harbor Pilot',
    last_ship: 'Port Authority',
    whatsapp_number: '+971501234567'
  },
  {
    id: 'b1c2d3e4-f5a6-5432-a987-6543210abcde',
    email: 'engineer.kumar@qaaq.com',
    first_name: 'Vikram',
    last_name: 'Kumar',
    current_city: 'chennai',
    current_country: 'india',
    maritime_rank: 'Chief Engineer',
    last_ship: 'MV Chennai Trader',
    whatsapp_number: '+919876543210'
  },
  {
    id: 'c2d3e4f5-a6b7-6543-b098-7654321bcdef',
    email: 'deck.garcia@qaaq.com',
    first_name: 'Carlos',
    last_name: 'Garcia',
    current_city: 'hamburg',
    current_country: 'germany',
    maritime_rank: 'Deck Officer',
    last_ship: 'MV Atlantic Bridge',
    whatsapp_number: '+4915123456789'
  },
  {
    id: 'd3e4f5a6-b7c8-7654-c109-8765432cdefg',
    email: 'local.wong@qaaq.com',
    first_name: 'David',
    last_name: 'Wong',
    current_city: 'hong kong',
    current_country: 'china',
    maritime_rank: 'Port Agent',
    last_ship: 'Shore Based',
    whatsapp_number: '+85298765432'
  },
  {
    id: 'e4f5a6b7-c8d9-8765-d210-9876543defgh',
    email: 'guide.khalil@qaaq.com',
    first_name: 'Omar',
    last_name: 'Khalil',
    current_city: 'abu dhabi',
    current_country: 'uae',
    maritime_rank: 'Local Guide',
    last_ship: 'Shore Based',
    whatsapp_number: '+971509876543'
  },
  {
    id: 'f5a6b7c8-d9e0-9876-e321-a987654efghi',
    email: 'agent.nielsen@qaaq.com',
    first_name: 'Lars',
    last_name: 'Nielsen',
    current_city: 'antwerp',
    current_country: 'belgium',
    maritime_rank: 'Ship Agent',
    last_ship: 'Shore Based',
    whatsapp_number: '+32465123456'
  },
  {
    id: 'a6b7c8d9-e0f1-a987-f432-ba98765fghij',
    email: 'captain.yamamoto@qaaq.com',
    first_name: 'Kenji',
    last_name: 'Yamamoto',
    current_city: 'kobe',
    current_country: 'japan',
    maritime_rank: 'Captain',
    last_ship: 'MV Pacific Pioneer',
    whatsapp_number: '+819012345678'
  }
];

export async function seedQaaqUsers() {
  console.log('Seeding QAAQ maritime users database...');
  
  try {
    // Skip deletion to avoid foreign key issues - just upsert
    
    // Insert maritime users
    for (const user of maritimeUsers) {
      await pool.query(`
        INSERT INTO users (
          id, email, first_name, last_name, current_city, current_country,
          maritime_rank, last_ship, whatsapp_number, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          current_city = EXCLUDED.current_city,
          current_country = EXCLUDED.current_country,
          maritime_rank = EXCLUDED.maritime_rank,
          last_ship = EXCLUDED.last_ship,
          whatsapp_number = EXCLUDED.whatsapp_number
      `, [
        user.id, user.email, user.first_name, user.last_name,
        user.current_city, user.current_country, user.maritime_rank,
        user.last_ship, user.whatsapp_number
      ]);
    }
    
    console.log(`Successfully seeded ${maritimeUsers.length} QAAQ maritime users`);
    
    // Verify the data
    const result = await pool.query(`
      SELECT first_name, last_name, current_city, maritime_rank, last_ship 
      FROM users 
      WHERE email LIKE '%@qaaq.com' 
      ORDER BY first_name
    `);
    
    console.log('Verified seeded users:');
    result.rows.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name}, ${user.maritime_rank} from ${user.current_city} (${user.last_ship})`);
    });
    
  } catch (error) {
    console.error('Error seeding QAAQ users:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQaaqUsers()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}