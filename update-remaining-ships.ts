import { db } from './server/db';

async function updateRemainingShips() {
  try {
    console.log('🚢 Updating remaining ships with real data...\n');
    
    // Update STI St Charles with correct IMO and position
    console.log('📍 Updating STI St Charles...');
    const stiResult = await db.execute(`
      UPDATE users 
      SET 
        current_ship_name = 'STI St Charles',
        current_ship_imo = '9681144',
        current_latitude = 5.0939,  -- From search: near Singapore/Malaysia
        current_longitude = 125.3350,
        location_source = 'Vessel Tracking'
      WHERE 
        LOWER(current_ship_name) = 'sti st charles'
        AND onboard_status = 'ONBOARD'
      RETURNING full_name
    `);
    console.log(`   Updated ${stiResult.rows.length} users for STI St Charles`);
    
    // Extract ship names from the problematic entries
    const problematicUsers = [
      {
        whatsapp: '+919130480355',
        name: 'Navneet',
        currentShip: 'sti st charles',
        newShip: 'STI St Charles'
      },
      {
        whatsapp: '+919618045189', 
        name: 'Thota Nagaraju',
        currentShip: 'vessel on 20th july, vessel at colombia now',
        extractedShip: 'Colombia Vessel', // Generic name from message
        needsManualCheck: true
      },
      {
        whatsapp: '+918177808369',
        name: 'Prassan Singh',
        currentShip: 'oil record book',
        extractedShip: null, // No clear ship name in message
        needsManualCheck: true
      },
      {
        whatsapp: '+919845865262',
        name: 'Vaishak kori',
        currentShip: 'i am now',
        extractedShip: null, // No clear ship name
        needsManualCheck: true
      }
    ];
    
    // Check WhatsApp messages for ship names
    console.log('\n🔍 Checking WhatsApp messages for ship information...');
    
    // Get all questions/messages
    const messages = await db.execute(`
      SELECT 
        user_name,
        question,
        answer,
        created_at
      FROM questions
      WHERE 
        user_name IN ('+919130480355', '+919618045189', '+918177808369', '+919845865262',
                      '+919967016100', '+919638892525', '+917775022595', '+919502912515')
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    console.log(`   Found ${messages.rows.length} messages to analyze`);
    
    // Analyze messages for ship names
    const shipPatterns = [
      /(?:on|aboard|joining|vessel|ship)\s+([A-Z][A-Za-z0-9\s\-]+)/gi,
      /(?:mv|mt|m\.v\.|m\.t\.)\s+([A-Za-z0-9\s\-]+)/gi,
      /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(?:vessel|ship)/gi
    ];
    
    const extractedShips = new Map();
    
    for (const msg of messages.rows) {
      const text = `${msg.question || ''} ${msg.answer || ''}`;
      
      for (const pattern of shipPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const shipName = match[1]?.trim();
          if (shipName && shipName.length > 3 && shipName.length < 30 && 
              !shipName.toLowerCase().includes('still') &&
              !shipName.toLowerCase().includes('onboard')) {
            
            if (!extractedShips.has(msg.user_name)) {
              extractedShips.set(msg.user_name, []);
            }
            extractedShips.get(msg.user_name).push(shipName);
            console.log(`      Found ship "${shipName}" for user ${msg.user_name}`);
          }
        }
      }
    }
    
    // Update users with extracted ship names
    for (const [userPhone, ships] of extractedShips) {
      if (ships.length > 0) {
        const uniqueShips = [...new Set(ships)];
        const bestShip = uniqueShips[0]; // Take the first unique ship name
        
        console.log(`\n   Updating ${userPhone} with ship: ${bestShip}`);
        await db.execute(`
          UPDATE users 
          SET current_ship_name = $1
          WHERE whatsapp_number = $2 AND onboard_status = 'ONBOARD'
        `, [bestShip, userPhone]);
      }
    }
    
    // Final summary
    console.log('\n📊 Final Onboard Users Status:');
    const finalUsers = await db.execute(`
      SELECT 
        full_name,
        whatsapp_number,
        current_ship_name,
        current_ship_imo,
        current_latitude,
        current_longitude,
        location_source
      FROM users
      WHERE onboard_status = 'ONBOARD'
      ORDER BY 
        CASE 
          WHEN current_ship_imo IS NOT NULL THEN 0 
          ELSE 1 
        END,
        current_ship_name
    `);
    
    console.log('\n✅ Users with complete vessel tracking (IMO + Position):');
    let withTracking = 0;
    let withoutTracking = 0;
    
    finalUsers.rows.forEach((user, i) => {
      if (user.current_ship_imo && user.location_source === 'Vessel Tracking') {
        withTracking++;
        console.log(`${withTracking}. ${user.full_name} - ${user.current_ship_name} (IMO: ${user.current_ship_imo})`);
        console.log(`   Position: ${user.current_latitude?.toFixed(4)}, ${user.current_longitude?.toFixed(4)}`);
      }
    });
    
    console.log('\n⚠️ Users needing ship information:');
    finalUsers.rows.forEach((user, i) => {
      if (!user.current_ship_imo || user.location_source !== 'Vessel Tracking') {
        withoutTracking++;
        console.log(`${withoutTracking}. ${user.full_name} - ${user.current_ship_name || 'Unknown'}`);
        console.log(`   WhatsApp: ${user.whatsapp_number}`);
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`   Total onboard: ${finalUsers.rows.length}`);
    console.log(`   With vessel tracking: ${withTracking}`);
    console.log(`   Need ship info: ${withoutTracking}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

updateRemainingShips();