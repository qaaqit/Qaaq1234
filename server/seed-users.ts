import { db } from "./db";
import { users } from "@shared/schema";

const sampleUsers = [
  {
    fullName: "James Miller",
    email: "captain.miller@qaaq.com",
    userType: "sailor" as const,
    rank: "Captain",
    city: "Singapore",
    country: "Singapore",
    latitude: "1.3521",
    longitude: "103.8198",
    isVerified: true,
    loginCount: 5
  },
  {
    fullName: "Sarah Chen",
    email: "chief.chen@qaaq.com",
    userType: "sailor" as const,
    rank: "Chief Engineer",
    city: "Rotterdam",
    country: "Netherlands",
    latitude: "51.9225",
    longitude: "4.47917",
    isVerified: true,
    loginCount: 3
  },
  {
    fullName: "Marco Rodriguez",
    email: "officer.rodriguez@qaaq.com",
    userType: "sailor" as const,
    rank: "First Officer",
    city: "Panama City",
    country: "Panama",
    latitude: "8.9824",
    longitude: "-79.5199",
    isVerified: true,
    loginCount: 2
  },
  {
    fullName: "Ahmed Hassan",
    email: "bosun.hassan@qaaq.com",
    userType: "sailor" as const,
    rank: "Bosun",
    city: "Dubai",
    country: "UAE",
    latitude: "25.2048",
    longitude: "55.2708",
    isVerified: true,
    loginCount: 4
  },
  {
    fullName: "Maria Santos",
    email: "maria.santos@local.com",
    userType: "local" as const,
    rank: null,
    city: "Santos",
    country: "Brazil",
    latitude: "-23.9618",
    longitude: "-46.3322",
    isVerified: true,
    loginCount: 2
  },
  {
    fullName: "John Smith",
    email: "john.smith@local.com",
    userType: "local" as const,
    rank: null,
    city: "Houston",
    country: "USA",
    latitude: "29.7604",
    longitude: "-95.3698",
    isVerified: true,
    loginCount: 1
  },
  {
    fullName: "Li Wei",
    email: "captain.li@qaaq.com",
    userType: "sailor" as const,
    rank: "Captain",
    city: "Shanghai",
    country: "China",
    latitude: "31.2304",
    longitude: "121.4737",
    isVerified: true,
    loginCount: 6
  },
  {
    fullName: "Olsen",
    email: "chief.olsen@qaaq.com",
    userType: "sailor" as const,
    rank: "Chief Officer",
    city: "Hamburg",
    country: "Germany",
    latitude: "53.5511",
    longitude: "9.9937",
    isVerified: true,
    loginCount: 3
  },
  {
    fullName: "Patel",
    email: "engineer.patel@qaaq.com",
    userType: "sailor" as const,
    rank: "Second Engineer",
    city: "Mumbai",
    country: "India",
    latitude: "19.0760",
    longitude: "72.8777",
    isVerified: true,
    loginCount: 2
  },
  {
    fullName: "Yuki",
    email: "yuki.guide@local.com",
    userType: "local" as const,
    rank: null,
    city: "Yokohama",
    country: "Japan",
    latitude: "35.4437",
    longitude: "139.6380",
    isVerified: true,
    loginCount: 4
  }
];

async function seedUsers() {
  console.log("Sample user seeding disabled - using only authentic QAAQ users from Notion");
  return; // Skip all sample user creation
  
  try {
    for (const user of sampleUsers) {
      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, user.email));
      
      if (existingUser.length === 0) {
        await db.insert(users).values(user);
        console.log(`Created user: ${user.fullName}`);
      } else {
        console.log(`User already exists: ${user.fullName}`);
      }
    }
    
    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding users:", error);
  }
}

// Import eq from drizzle-orm
import { eq } from "drizzle-orm";

// Run the seed function
seedUsers().then(() => process.exit(0));