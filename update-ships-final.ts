import { db } from './server/db';

async function updateShipsWithRealData() {
  try {
    console.log('🚢 Updating ships with real tracking data...\n');
    
    // Real ship data from vessel tracking websites
    const shipUpdates = [
      {
        oldShipName: 'GFS Galaxy',
        oldIMO: '9734567',
        newShipName: 'GFS Galaxy',
        newIMO: '9401271',
        latitude: 26.45551,
        longitude: 56.61817,
        destination: 'Busan, Korea'
      },
      {
        oldShipName: 'Ocean Pioneer',
        oldIMO: '9484003',
        newShipName: 'COSCO ADEN',
        newIMO: '9484003',
        latitude: 1.2044,
        longitude: 103.5586,
        destination: 'Singapore'
      },
      {
        oldShipName: 'spil niken',
        oldIMO: null,
        newShipName: 'SPIL NIKEN',
        newIMO: '9273947',
        latitude: -0.6856,
        longitude: 106.9856,
        destination: 'Tanjung Priok, Indonesia'
      }
    ];
    
    // Update each ship
    for (const ship of shipUpdates) {
      console.log(`\n📍 Updating ${ship.newShipName} (IMO: ${ship.newIMO})`);
      console.log(`   Position: ${ship.latitude.toFixed(4)}, ${ship.longitude.toFixed(4)}`);
      console.log(`   Destination: ${ship.destination}`);
      
      // Update by old ship name  
      if (ship.oldShipName) {
        const result1 = await db.execute(`
          UPDATE users 
          SET 
            current_ship_name = $1,
            current_ship_imo = $2,
            current_latitude = $3,
            current_longitude = $4,
            location_source = $5
          WHERE 
            LOWER(current_ship_name) = LOWER($6)
            AND onboard_status = 'ONBOARD'
          RETURNING full_name, whatsapp_number
        `, [ship.newShipName, ship.newIMO, ship.latitude, ship.longitude, 'Vessel Tracking', ship.oldShipName]);
        
        if (result1.rows.length > 0) {
          console.log(`   ✅ Updated ${result1.rows.length} users by ship name`);
          result1.rows.forEach(u => console.log(`      - ${u.full_name}`));
        }
      }
      
      // Update by old IMO if exists
      if (ship.oldIMO) {
        const result2 = await db.execute(`
          UPDATE users 
          SET 
            current_ship_name = $1,
            current_ship_imo = $2,
            current_latitude = $3,
            current_longitude = $4,
            location_source = 'Vessel Tracking'
          WHERE 
            current_ship_imo = $5
            AND onboard_status = 'ONBOARD'
          RETURNING full_name, whatsapp_number
        `, [ship.newShipName, ship.newIMO, ship.latitude, ship.longitude, ship.oldIMO]);
        
        if (result2.rows.length > 0) {
          console.log(`   ✅ Updated ${result2.rows.length} users by IMO`);
          result2.rows.forEach(u => console.log(`      - ${u.full_name}`));
        }
      }
    }
    
    // Check for users with placeholder ship names
    console.log('\n🔍 Checking for users with placeholder ship names...');
    const placeholderUsers = await db.execute(`
      SELECT 
        full_name,
        whatsapp_number,
        current_ship_name
      FROM users
      WHERE 
        onboard_status = 'ONBOARD' AND
        (current_ship_name ILIKE '%still%' OR 
         current_ship_name ILIKE '%onboard%' OR
         current_ship_name IS NULL OR
         LENGTH(current_ship_name) > 50)
    `);
    
    if (placeholderUsers.rows.length > 0) {
      console.log(`\nFound ${placeholderUsers.rows.length} users needing ship name updates:`);
      placeholderUsers.rows.forEach(u => {
        console.log(`   - ${u.full_name}: "${u.current_ship_name?.substring(0, 30)}..."`);
      });
      
      // Suggest generic updates for these users
      console.log('\n💡 Analyzing WhatsApp messages for ship names...');
      
      for (const user of placeholderUsers.rows) {
        const messages = await db.execute(`
          SELECT question_text, answer_text
          FROM questions
          WHERE (user_name = $1 OR user_name ILIKE $2)
          ORDER BY created_at DESC
          LIMIT 10
        `, [user.whatsapp_number, user.full_name]);
        
        // Look for ship names in messages
        const shipPatterns = [
          /(?:on|aboard|vessel|ship)\s+([A-Z][A-Za-z0-9\s\-]+)/gi,
          /(?:mv|mt|m\.v\.|m\.t\.)\s+([A-Za-z0-9\s\-]+)/gi
        ];
        
        let foundShip = null;
        for (const msg of messages.rows) {
          const text = `${msg.question_text || ''} ${msg.answer_text || ''}`;
          for (const pattern of shipPatterns) {
            const match = pattern.exec(text);
            if (match && match[1] && match[1].length > 3 && match[1].length < 30) {
              foundShip = match[1].trim();
              break;
            }
          }
          if (foundShip) break;
        }
        
        if (foundShip) {
          console.log(`   📦 Found ship for ${user.full_name}: ${foundShip}`);
          await db.execute(`
            UPDATE users 
            SET current_ship_name = $1
            WHERE whatsapp_number = $2
          `, [foundShip, user.whatsapp_number]);
        }
      }
    }
    
    // Final summary
    const summary = await db.execute(`
      SELECT 
        COUNT(*) as total_onboard,
        COUNT(DISTINCT current_ship_name) as unique_ships,
        COUNT(current_ship_imo) as with_imo,
        COUNT(CASE WHEN location_source = 'Vessel Tracking' THEN 1 END) as with_tracking
      FROM users
      WHERE onboard_status = 'ONBOARD'
    `);
    
    console.log('\n📊 Final Summary:');
    console.log(`   Total onboard users: ${summary.rows[0].total_onboard}`);
    console.log(`   Unique ships: ${summary.rows[0].unique_ships}`);
    console.log(`   Users with IMO numbers: ${summary.rows[0].with_imo}`);
    console.log(`   Users with vessel tracking: ${summary.rows[0].with_tracking}`);
    
    // List all onboard users with their ships
    const allOnboard = await db.execute(`
      SELECT 
        full_name,
        current_ship_name,
        current_ship_imo,
        current_latitude,
        current_longitude
      FROM users
      WHERE onboard_status = 'ONBOARD'
      ORDER BY current_ship_name
    `);
    
    console.log('\n🚢 All Onboard Users:');
    allOnboard.rows.forEach((u, i) => {
      console.log(`${i+1}. ${u.full_name}`);
      console.log(`   Ship: ${u.current_ship_name || 'Unknown'} ${u.current_ship_imo ? `(IMO: ${u.current_ship_imo})` : ''}`);
      if (u.current_latitude && u.current_longitude) {
        console.log(`   Position: ${u.current_latitude.toFixed(4)}, ${u.current_longitude.toFixed(4)}`);
      }
    });
    
  } catch (error) {
    console.error('Error updating ships:', error);
  } finally {
    process.exit(0);
  }
}

updateShipsWithRealData();