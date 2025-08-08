import { db } from './db';
import { users } from '@shared/schema';

export async function seedTestData() {
  console.log('🌱 Seeding test data for robust authentication testing...');
  
  const testUsers = [
    // Chiru - Main user with multiple potential duplicate scenarios
    {
      id: '+919035283755',
      fullName: 'Chiru Rank',
      email: 'pg97@rediffmail.com',
      password: '1234koihai',
      userType: 'sailor',
      isAdmin: false,
      rank: 'engine_cadet',
      maritimeRank: 'Engine Cadet',
      shipName: 'MV Ocean Explorer',
      currentShipName: 'MV Ocean Explorer',
      imoNumber: '9876543',
      currentShipIMO: '9876543',
      city: 'Mumbai',
      currentCity: 'Mumbai',
      country: 'India',
      nationality: 'Indian',
      latitude: 19.0760,
      longitude: 72.8777,
      currentLatitude: 19.0760,
      currentLongitude: 72.8777,
      whatsAppNumber: '+919035283755',
      questionCount: 17,
      answerCount: 3,
      hasCompletedOnboarding: true,
      isVerified: true,
      locationSource: 'device',
      locationUpdatedAt: new Date()
    },
    
    // Potential duplicate of Chiru (different phone format)
    {
      id: '919035283755',
      fullName: 'Chiru Rank',
      email: 'chirumarine@gmail.com',
      password: '1234koihai',
      userType: 'sailor',
      isAdmin: false,
      rank: 'engine_cadet',
      maritimeRank: 'Engine Cadet',
      shipName: 'Unknown vessel',
      city: 'Chennai',
      currentCity: 'Chennai',
      country: 'India',
      latitude: 13.0827,
      longitude: 80.2707,
      whatsAppNumber: '919035283755',
      questionCount: 5,
      answerCount: 0,
      hasCompletedOnboarding: false,
      isVerified: true,
      locationSource: 'city',
      locationUpdatedAt: new Date()
    },
    
    // Another potential duplicate (WhatsApp bot entry)
    {
      id: 'user_1754628345146',
      fullName: 'Chiru R',
      email: 'temp@example.com',
      password: '1234koihai',
      userType: 'local',
      isAdmin: false,
      city: 'Mumbai',
      country: 'India',
      latitude: 19.0760,
      longitude: 72.8777,
      whatsAppNumber: '+919035283755',
      whatsAppDisplayName: 'Chiru Rank',
      questionCount: 0,
      answerCount: 0,
      hasCompletedOnboarding: false,
      isVerified: true,
      locationSource: 'city',
      locationUpdatedAt: new Date()
    },
    
    // Admin user
    {
      id: '+919029010070',
      fullName: 'Piyush Gupta',
      email: 'mushy.piyush@gmail.com',
      password: '1234koihai',
      userType: 'local',
      isAdmin: true,
      isPlatformAdmin: true,
      rank: 'Administrator',
      maritimeRank: 'TSI',
      city: 'Mumbai',
      currentCity: 'Mumbai',
      country: 'India',
      latitude: 19.0760,
      longitude: 72.8777,
      currentLatitude: 19.0760,
      currentLongitude: 72.8777,
      whatsAppNumber: '+919029010070',
      questionCount: 45,
      answerCount: 89,
      hasCompletedOnboarding: true,
      isVerified: true,
      locationSource: 'device',
      locationUpdatedAt: new Date()
    },
    
    // Various maritime professionals for testing
    {
      id: '+918956234571',
      fullName: 'Rajesh Kumar',
      email: 'rajesh.maritime@gmail.com',
      password: '1234koihai',
      userType: 'sailor',
      isAdmin: false,
      rank: 'chief_engineer',
      maritimeRank: 'Chief Engineer',
      shipName: 'MV Star Navigator',
      currentShipName: 'MV Star Navigator',
      imoNumber: '9345678',
      currentShipIMO: '9345678',
      city: 'Kochi',
      currentCity: 'Kochi',
      country: 'India',
      nationality: 'Indian',
      latitude: 9.9312,
      longitude: 76.2673,
      currentLatitude: 9.9312,
      currentLongitude: 76.2673,
      whatsAppNumber: '+918956234571',
      questionCount: 23,
      answerCount: 15,
      hasCompletedOnboarding: true,
      isVerified: true,
      locationSource: 'device',
      locationUpdatedAt: new Date()
    },
    
    {
      id: '+917845612398',
      fullName: 'Vikram Singh',
      email: 'vikram.deck@outlook.com',
      password: '1234koihai',
      userType: 'sailor',
      isAdmin: false,
      rank: 'second_officer',
      maritimeRank: 'Second Officer',
      shipName: 'MV Global Trader',
      currentShipName: 'MV Global Trader',
      imoNumber: '9567890',
      city: 'Singapore',
      currentCity: 'Singapore',
      country: 'Singapore',
      nationality: 'Indian',
      latitude: 1.3521,
      longitude: 103.8198,
      currentLatitude: 1.3521,
      currentLongitude: 103.8198,
      whatsAppNumber: '+917845612398',
      questionCount: 8,
      answerCount: 4,
      hasCompletedOnboarding: true,
      isVerified: true,
      locationSource: 'device',
      locationUpdatedAt: new Date()
    },
    
    // Local maritime service providers
    {
      id: '+919876543210',
      fullName: 'Amit Shipping Services',
      email: 'amit@shippingservices.com',
      password: '1234koihai',
      userType: 'local',
      isAdmin: false,
      city: 'Mumbai',
      currentCity: 'Mumbai',
      country: 'India',
      latitude: 19.0760,
      longitude: 72.8777,
      whatsAppNumber: '+919876543210',
      questionCount: 12,
      answerCount: 25,
      hasCompletedOnboarding: true,
      isVerified: true,
      locationSource: 'city',
      locationUpdatedAt: new Date()
    }
  ];
  
  try {
    // Clear existing test data
    const userIds = testUsers.map(u => u.id);
    for (const id of userIds) {
      await db.execute('DELETE FROM users WHERE id = $1', [id]);
    }
    
    // Insert test users
    for (const user of testUsers) {
      await db.insert(users).values({
        ...user,
        createdAt: new Date(),
        lastLogin: new Date(),
        loginCount: Math.floor(Math.random() * 10) + 1
      });
    }
    
    console.log(`✅ Successfully seeded ${testUsers.length} test users`);
    
    // Create indexes for performance
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_phone_test ON users(id) WHERE id LIKE '+%'`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email_test ON users(email)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_whatsapp_test ON users("whatsAppNumber")`);
    
    console.log('✅ Database indexes created');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
}

export async function verifyTestData() {
  console.log('\n🔍 Verifying test data...');
  
  try {
    // Check total users
    const userCount = await db.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users: ${userCount.rows[0].count}`);
    
    // Check Chiru variants
    const chiruVariants = await db.execute(`
      SELECT id, "fullName", email, "questionCount", "whatsAppNumber"
      FROM users 
      WHERE id LIKE '%919035283755%' OR "whatsAppNumber" LIKE '%919035283755%' OR "fullName" ILIKE '%chiru%'
    `);
    
    console.log(`🔍 Chiru variants found: ${chiruVariants.rows.length}`);
    chiruVariants.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.id} - ${row.fullName} - Q:${row.questionCount}`);
    });
    
    // Check admins
    const admins = await db.execute('SELECT id, "fullName", "isAdmin" FROM users WHERE "isAdmin" = true');
    console.log(`👑 Admin users: ${admins.rows.length}`);
    admins.rows.forEach((admin) => {
      console.log(`   Admin: ${admin.fullName} (${admin.id})`);
    });
    
    console.log('✅ Test data verification complete');
    return true;
    
  } catch (error) {
    console.error('❌ Test data verification failed:', error);
    return false;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => verifyTestData())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}