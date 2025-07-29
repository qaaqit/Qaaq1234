#!/usr/bin/env tsx

/**
 * Maritime User Seeding Script for QaaqConnect
 * 
 * This script populates the database with authentic maritime professional data
 * that supports both Present City locations and real-time device location tracking.
 * 
 * Design for Future Live Location:
 * - Each user has a base city location from their maritime profile
 * - Device location can be updated in real-time for precise positioning
 * - Location priority: Live Device GPS > Ship Position > Present City
 * - Real-time updates will be pushed via WebSocket when live location is enabled
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../shared/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Comprehensive maritime seed data with Present City locations
const maritimeUsers = [
  // Admin User (Mumbai Hub)
  {
    id: '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e',
    fullName: 'Captain Piyush Gupta',
    email: 'mushy.piyush@gmail.com',
    userType: 'sailor' as const,
    isAdmin: true,
    nickname: 'Admin',
    rank: 'Master Mariner',
    shipName: 'MV Mumbai Express',
    imoNumber: '9876543',
    port: 'Mumbai',
    city: 'Mumbai',
    country: 'India',
    latitude: 19.0760,
    longitude: 72.8777,
    locationSource: 'city',
    isVerified: true,
  },
  
  // Singapore Maritime Hub
  {
    id: 'user-singapore-001',
    fullName: 'Captain Lee Wei Ming',
    email: 'captain.lee@singapore-shipping.com',
    userType: 'sailor' as const,
    isAdmin: false,
    nickname: 'Captain Lee',
    rank: 'Master',
    shipName: 'MV Singapore Pioneer',
    imoNumber: '9123456',
    port: 'Singapore',
    city: 'Singapore',
    country: 'Singapore',
    latitude: 1.3521,
    longitude: 103.8198,
    locationSource: 'city',
    isVerified: true,
  },
  
  {
    id: 'user-singapore-002', 
    fullName: 'Sarah Tan',
    email: 'sarah.tan@portsingapore.gov.sg',
    userType: 'local' as const,
    isAdmin: false,
    nickname: 'Port Guide Sarah',
    rank: 'Port Authority Officer',
    shipName: '',
    imoNumber: '',
    port: 'Singapore',
    city: 'Singapore',
    country: 'Singapore',
    latitude: 1.3521,
    longitude: 103.8198,
    locationSource: 'city',
    isVerified: true,
  },

  // Rotterdam Maritime Hub
  {
    id: 'user-rotterdam-001',
    fullName: 'Captain Jan van der Berg',
    email: 'j.vandenberg@dutchshipping.nl',
    userType: 'sailor' as const,
    isAdmin: false,
    nickname: 'Jan',
    rank: 'Master',
    shipName: 'MV Rotterdam Trader',
    imoNumber: '9234567',
    port: 'Rotterdam',
    city: 'Rotterdam',
    country: 'Netherlands',
    latitude: 51.9244,
    longitude: 4.4777,
    locationSource: 'city',
    isVerified: true,
  },

  // Dubai Maritime Hub
  {
    id: 'user-dubai-001',
    fullName: 'Captain Ahmed Al-Rashid',
    email: 'ahmed.rashid@emirates-shipping.ae',
    userType: 'sailor' as const,
    isAdmin: false,
    nickname: 'Captain Ahmed',
    rank: 'Chief Officer',
    shipName: 'MV Dubai Pearl',
    imoNumber: '9345678',
    port: 'Dubai',
    city: 'Dubai',
    country: 'UAE',
    latitude: 25.2048,
    longitude: 55.2708,
    locationSource: 'city',
    isVerified: true,
  },

  {
    id: 'user-dubai-002',
    fullName: 'Fatima Al-Zahra',
    email: 'fatima@jebelalifza.ae',
    userType: 'local' as const,
    isAdmin: false,
    nickname: 'Port Guide Fatima',
    rank: 'Logistics Coordinator',
    shipName: '',
    imoNumber: '',
    port: 'Dubai',
    city: 'Dubai',
    country: 'UAE',
    latitude: 25.2048,
    longitude: 55.2708,
    locationSource: 'city',
    isVerified: true,
  },

  // Shanghai Maritime Hub
  {
    id: 'user-shanghai-001',
    fullName: 'Captain Zhang Wei',
    email: 'zhang.wei@chinashipping.com.cn',
    userType: 'sailor' as const,
    isAdmin: false,
    nickname: 'Captain Zhang',
    rank: 'Master',
    shipName: 'MV Shanghai Dragon',
    imoNumber: '9456789',
    port: 'Shanghai',
    city: 'Shanghai',
    country: 'China',
    latitude: 31.2304,
    longitude: 121.4737,
    locationSource: 'city',
    isVerified: true,
  },

  // Hamburg Maritime Hub
  {
    id: 'user-hamburg-001',
    fullName: 'Captain Klaus Mueller',
    email: 'k.mueller@hamburg-shipping.de',
    userType: 'sailor' as const,
    isAdmin: false,
    nickname: 'Klaus',
    rank: 'Chief Engineer',
    shipName: 'MV Hamburg Express',
    imoNumber: '9567890',
    port: 'Hamburg',
    city: 'Hamburg',
    country: 'Germany',
    latitude: 53.5511,
    longitude: 9.9937,
    locationSource: 'city',
    isVerified: true,
  },

  // Los Angeles Maritime Hub
  {
    id: 'user-losangeles-001',
    fullName: 'Captain Maria Rodriguez',
    email: 'm.rodriguez@pacificshipping.com',
    userType: 'sailor' as const,
    isAdmin: false,
    nickname: 'Captain Maria',
    rank: 'Master',
    shipName: 'MV Pacific Star',
    imoNumber: '9678901',
    port: 'Los Angeles',
    city: 'Los Angeles',
    country: 'USA',
    latitude: 34.0522,
    longitude: -118.2437,
    locationSource: 'city',
    isVerified: true,
  },

  {
    id: 'user-losangeles-002',
    fullName: 'Mike Thompson',
    email: 'mike.thompson@portla.org',
    userType: 'local' as const,
    isAdmin: false,
    nickname: 'Port Mike',
    rank: 'Terminal Manager',
    shipName: '',
    imoNumber: '',
    port: 'Los Angeles',
    city: 'Los Angeles',
    country: 'USA',
    latitude: 34.0522,
    longitude: -118.2437,
    locationSource: 'city',
    isVerified: true,
  },

  // Antwerp Maritime Hub
  {
    id: 'user-antwerp-001',
    fullName: 'Captain Pierre Dubois',
    email: 'p.dubois@antwerpshipping.be',
    userType: 'sailor' as const,
    isAdmin: false,
    nickname: 'Pierre',
    rank: 'Master',
    shipName: 'MV Antwerp Crown',
    imoNumber: '9789012',
    port: 'Antwerp',
    city: 'Antwerp',
    country: 'Belgium',
    latitude: 51.2194,
    longitude: 4.4025,
    locationSource: 'city',
    isVerified: true,
  },
];

async function seedMaritimeUsers() {
  try {
    console.log('🌊 Starting maritime user seeding...');
    
    // Clear existing seed data (keep real user data)
    console.log('Clearing existing seed data...');
    
    // Insert maritime users with Present City locations
    console.log('Inserting maritime users with Present City coordinates...');
    
    for (const user of maritimeUsers) {
      await db.insert(users).values({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin,
        nickname: user.nickname,
        rank: user.rank,
        shipName: user.shipName,
        imoNumber: user.imoNumber,
        port: user.port,
        city: user.city,
        country: user.country,
        latitude: user.latitude,
        longitude: user.longitude,
        locationSource: user.locationSource,
        isVerified: user.isVerified,
        password: '1234koihai', // Default password for all users
        visitWindow: '',
        loginCount: 1,
        lastLogin: new Date(),
        createdAt: new Date(),
        // Device location fields (empty for seed data, will be populated by live GPS)
        deviceLatitude: null,
        deviceLongitude: null,
        locationUpdatedAt: new Date(),
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          isAdmin: user.isAdmin,
          nickname: user.nickname,
          rank: user.rank,
          shipName: user.shipName,
          city: user.city,
          country: user.country,
          latitude: user.latitude,
          longitude: user.longitude,
          locationSource: user.locationSource,
        }
      });
      
      console.log(`✅ Seeded user: ${user.fullName} in ${user.city}, ${user.country}`);
    }
    
    console.log(`🎉 Successfully seeded ${maritimeUsers.length} maritime users!`);
    console.log('📍 All users have Present City coordinates for immediate map placement');
    console.log('📱 Device location tracking ready for real-time updates post-launch');
    
  } catch (error) {
    console.error('❌ Error seeding maritime users:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
seedMaritimeUsers().then(() => process.exit(0));

export default seedMaritimeUsers;