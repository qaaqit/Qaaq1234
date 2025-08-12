import { db } from './server/db';

interface ShipLocation {
  shipName: string;
  imoNumber: string;
  latitude: number;
  longitude: number;
  destination?: string;
  speed?: number;
  status?: string;
  lastUpdate?: Date;
}

async function updateShipLocationsAndIMO() {
  try {
    console.log('🚢 Updating ship locations and IMO numbers...\n');
    
    // Known ships from search results with correct IMO numbers and actual positions
    const shipData: ShipLocation[] = [
      {
        shipName: 'GFS Galaxy',
        imoNumber: '9401271', // Corrected IMO (was 9734567)
        latitude: 26.45551, // Actual position from VesselFinder
        longitude: 56.61817,
        destination: 'Busan, Korea',
        speed: 17.4,
        status: 'Under way'
      },
      {
        shipName: 'COSCO ADEN', // Actual ship name for IMO 9484003
        imoNumber: '9484003',
        latitude: 1.2044, // En route to Singapore
        longitude: 103.5586,
        destination: 'Singapore',
        speed: 15.4,
        status: 'En route'
      },
      {
        shipName: 'SPIL NIKEN',
        imoNumber: '9273947',
        latitude: -0.6856, // Near Indonesia (from search results)
        longitude: 106.9856,
        destination: 'Tanjung Priok, Indonesia',
        speed: 12.6,
        status: 'En route'
      }
    ];
    
    // First, update the ship names and IMO numbers
    for (const ship of shipData) {
      console.log(`\n📍 Updating ${ship.shipName} (IMO: ${ship.imoNumber})`);
      console.log(`   Location: ${ship.latitude.toFixed(4)}, ${ship.longitude.toFixed(4)}`);
      console.log(`   Destination: ${ship.destination || 'Unknown'}`);
      console.log(`   Status: ${ship.status || 'Unknown'}`);
      
      // Update users who are on this ship
      // First try to match by existing ship name or IMO
      const updateResult = await db.execute(`
        UPDATE users 
        SET 
          current_ship_name = $1,
          current_ship_imo = $2,
          current_latitude = $3,
          current_longitude = $4,
          location_source = 'Vessel Tracking'
        WHERE 
          (current_ship_name ILIKE $1 OR 
           current_ship_name ILIKE '%' || $1 || '%' OR
           current_ship_imo = $2 OR
           (current_ship_name = 'Ocean Pioneer' AND $1 = 'COSCO ADEN') OR
           (current_ship_imo = '9734567' AND $2 = '9401271'))
          AND onboard_status = 'ONBOARD'
        RETURNING full_name, whatsapp_number
      `, [
        ship.shipName,
        ship.imoNumber,
        ship.latitude,
        ship.longitude
      ]);
      
      if (updateResult.rows.length > 0) {
        console.log(`   ✅ Updated ${updateResult.rows.length} users:`);
        updateResult.rows.forEach(user => {
          console.log(`      - ${user.full_name} (${user.whatsapp_number})`);
        });
      }
    }
    
    // Now check for users with generic ship names and try to extract from WhatsApp
    const genericShipUsers = await db.execute(`
      SELECT 
        u.id,
        u.full_name,
        u.whatsapp_number,
        u.current_ship_name,
        u.onboard_status
      FROM users u
      WHERE 
        u.onboard_status = 'ONBOARD' AND
        (u.current_ship_name ILIKE '%still%' OR 
         u.current_ship_name ILIKE '%onboard%' OR
         u.current_ship_name IS NULL OR
         LENGTH(u.current_ship_name) > 50)
    `);
    
    console.log(`\n📋 Found ${genericShipUsers.rows.length} users with generic ship names`);
    
    // Check their WhatsApp messages for ship information
    for (const user of genericShipUsers.rows) {
      console.log(`\n🔍 Checking messages for ${user.full_name} (${user.whatsapp_number})`);
      
      const messages = await db.execute(`
        SELECT question_text, answer_text, created_at
        FROM questions
        WHERE user_name = $1 OR user_name = $2
        ORDER BY created_at DESC
        LIMIT 20
      `, [user.whatsapp_number, user.full_name]);
      
      // Extract ship names from messages
      let extractedShipName = null;
      const shipPatterns = [
        /(?:on|aboard|vessel|ship)\s+([A-Z][A-Za-z0-9\s\-]+)(?:\s|$)/gi,
        /(?:mv|mt|m\.v\.|m\.t\.)\s+([A-Za-z0-9\s\-]+)/gi,
        /([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)(?:\s+ship|\s+vessel)/gi
      ];
      
      for (const msg of messages.rows) {
        const text = `${msg.question_text || ''} ${msg.answer_text || ''}`;
        
        for (const pattern of shipPatterns) {
          const matches = text.matchAll(pattern);
          for (const match of matches) {
            const shipName = match[1]?.trim();
            if (shipName && shipName.length > 3 && shipName.length < 30 && 
                !shipName.toLowerCase().includes('still') &&
                !shipName.toLowerCase().includes('onboard')) {
              extractedShipName = shipName;
              console.log(`   📦 Found ship name: ${shipName}`);
              break;
            }
          }
          if (extractedShipName) break;
        }
        if (extractedShipName) break;
      }
      
      if (extractedShipName) {
        // Update user with extracted ship name
        await db.execute(`
          UPDATE users 
          SET current_ship_name = $1
          WHERE whatsapp_number = $2
        `, [extractedShipName, user.whatsapp_number]);
        console.log(`   ✅ Updated ship name to: ${extractedShipName}`);
      }
    }
    
    // Get summary of all onboard users
    const finalSummary = await db.execute(`
      SELECT 
        COUNT(*) as total_onboard,
        COUNT(DISTINCT current_ship_name) as unique_ships,
        COUNT(current_ship_imo) as with_imo
      FROM users
      WHERE onboard_status = 'ONBOARD'
    `);
    
    console.log('\n📊 Final Summary:');
    console.log(`   Total onboard users: ${finalSummary.rows[0].total_onboard}`);
    console.log(`   Unique ships: ${finalSummary.rows[0].unique_ships}`);
    console.log(`   Users with IMO numbers: ${finalSummary.rows[0].with_imo}`);
    
  } catch (error) {
    console.error('Error updating ship locations:', error);
  } finally {
    process.exit(0);
  }
}

updateShipLocationsAndIMO();