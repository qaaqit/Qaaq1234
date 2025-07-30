import { db } from "./db";
import { users } from "@shared/schema";

const sampleUsers = [
  // Sample sailors in major maritime cities
  {
    fullName: "Captain Sarah Johnson",
    email: "captain.johnson@example.com",
    userType: "sailor",
    rank: "Captain",
    shipName: "MV Atlantic Explorer",
    port: "New York",
    visitWindow: "5 to 8 Aug25",
    city: "New York",
    country: "USA",
    latitude: "40.7128",
    longitude: "-74.0060",
    isVerified: true
  },
  {
    fullName: "Chief Engineer David Kim",
    email: "chief.kim@example.com",
    userType: "sailor",
    rank: "Chief Engineer",
    shipName: "MV Pacific Star",
    port: "Los Angeles",
    visitWindow: "12 to 15 Aug25",
    city: "Los Angeles",
    country: "USA",
    latitude: "34.0522",
    longitude: "-118.2437",
    isVerified: true
  },
  {
    fullName: "First Officer Maria Garcia",
    email: "officer.garcia@example.com",
    userType: "sailor",
    rank: "First Officer",
    shipName: "MV Mediterranean Sun",
    port: "Barcelona",
    visitWindow: "20 to 23 Aug25",
    city: "Barcelona",
    country: "Spain",
    latitude: "41.3851",
    longitude: "2.1734",
    isVerified: true
  },
  {
    fullName: "Bosun Ahmed Al-Rashid",
    email: "bosun.ahmed@example.com",
    userType: "sailor",
    rank: "Bosun",
    shipName: "MV Arabian Pearl",
    port: "Jeddah",
    visitWindow: "28 to 31 Aug25",
    city: "Jeddah",
    country: "Saudi Arabia",
    latitude: "21.4858",
    longitude: "39.1925",
    isVerified: true
  },
  {
    fullName: "Engineer Priya Sharma",
    email: "engineer.sharma@example.com",
    userType: "sailor",
    rank: "Second Engineer",
    shipName: "MV Indian Ocean",
    port: "Chennai",
    visitWindow: "3 to 6 Sep25",
    city: "Chennai",
    country: "India",
    latitude: "13.0827",
    longitude: "80.2707",
    isVerified: true
  },
  // Sample locals in port cities
  {
    fullName: "Robert Thompson",
    email: "robert.thompson@example.com",
    userType: "local",
    rank: null,
    shipName: null,
    port: null,
    visitWindow: null,
    city: "London",
    country: "UK",
    latitude: "51.5074",
    longitude: "-0.1278",
    isVerified: true
  },
  {
    fullName: "Yuki Tanaka",
    email: "yuki.tanaka@example.com",
    userType: "local",
    rank: null,
    shipName: null,
    port: null,
    visitWindow: null,
    city: "Tokyo",
    country: "Japan",
    latitude: "35.6762",
    longitude: "139.6503",
    isVerified: true
  },
  {
    fullName: "Hans Mueller",
    email: "hans.mueller@example.com",
    userType: "local",
    rank: null,
    shipName: null,
    port: null,
    visitWindow: null,
    city: "Hamburg",
    country: "Germany",
    latitude: "53.5511",
    longitude: "9.9937",
    isVerified: true
  },
  {
    fullName: "Isabella Rossi",
    email: "isabella.rossi@example.com",
    userType: "local",
    rank: null,
    shipName: null,
    port: null,
    visitWindow: null,
    city: "Genoa",
    country: "Italy",
    latitude: "44.4056",
    longitude: "8.9463",
    isVerified: true
  },
  {
    fullName: "Carlos Rodriguez",
    email: "carlos.rodriguez@example.com",
    userType: "local",
    rank: null,
    shipName: null,
    port: null,
    visitWindow: null,
    city: "Valparaiso",
    country: "Chile",
    latitude: "-33.0458",
    longitude: "-71.6197",
    isVerified: true
  }
];

async function seedSampleUsers() {
  console.log("Sample user seeding disabled - using only authentic QAAQ users from Notion");
  return; // Skip all sample user creation
  
  try {
    for (const userData of sampleUsers) {
      // Check if user already exists
      const existingUsers = await db.select().from(users).where(
        (table) => table.email === userData.email
      );
      
      if (existingUsers.length === 0) {
        await db.insert(users).values(userData);
        console.log(`Added sample user: ${userData.fullName} (${userData.city})`);
      } else {
        console.log(`User already exists: ${userData.fullName}`);
      }
    }
    
    console.log("Sample user seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding sample users:", error);
  }
}

// Run the seeding function
seedSampleUsers().then(() => process.exit(0));