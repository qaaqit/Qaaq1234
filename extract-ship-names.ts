import { db } from './server/db';

async function extractShipNamesFromMessages() {
  try {
    console.log('🔍 Extracting ship names from WhatsApp messages...\n');
    
    // Get users with placeholder ship names
    const placeholderUsers = await db.execute(`
      SELECT 
        full_name,
        whatsapp_number,
        current_ship_name
      FROM users
      WHERE 
        onboard_status = 'ONBOARD' AND
        (current_ship_name ILIKE '%still%' OR 
         current_ship_name ILIKE '%i am%' OR
         current_ship_name IS NULL OR
         LENGTH(current_ship_name) > 50)
    `);
    
    console.log(`Found ${placeholderUsers.rows.length} users needing ship name extraction:\n`);
    
    // Check WhatsApp messages for each user
    for (const user of placeholderUsers.rows) {
      console.log(`\n📱 Checking messages for ${user.full_name} (${user.whatsapp_number})`);
      console.log(`   Current ship name: "${user.current_ship_name?.substring(0, 50)}..."`);
      
      // Get their messages
      const messages = await db.execute(`
        SELECT 
          question_text,
          answer_text,
          created_at
        FROM questions
        WHERE 
          (user_name = $1 OR 
           user_name = $2 OR
           user_name ILIKE $3)
        ORDER BY created_at DESC
        LIMIT 30
      `, [user.whatsapp_number, user.full_name, `%${user.full_name}%`]);
      
      console.log(`   Found ${messages.rows.length} messages`);
      
      // Ship name extraction patterns
      const patterns = [
        // Direct ship mentions
        /(?:on|aboard|vessel|ship|joining)\s+(?:mv|mt|m\.v\.|m\.t\.)?\s*([A-Z][A-Za-z0-9\s\-]+)/gi,
        // Ship names with vessel/ship suffix
        /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(?:vessel|ship)/gi,
        // IMO mentions
        /IMO\s*[:]\s*(\d{7})/gi,
        // STI pattern
        /(?:sti|STI)\s+([A-Za-z\s]+)/gi,
        // Joining mentions
        /joining\s+([A-Z][A-Za-z0-9\s\-]+)/gi,
        // Vessel at mentions
        /vessel\s+at\s+([A-Za-z]+)/gi
      ];
      
      let bestShipName = null;
      let bestScore = 0;
      
      for (const msg of messages.rows) {
        const text = `${msg.question_text || ''} ${msg.answer_text || ''}`;
        
        for (const pattern of patterns) {
          const matches = [...text.matchAll(pattern)];
          for (const match of matches) {
            const shipName = match[1]?.trim();
            
            // Score the ship name
            if (shipName && shipName.length > 2 && shipName.length < 40) {
              let score = 0;
              
              // Higher score for recent messages
              const daysSince = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60 * 60 * 24);
              score += Math.max(0, 100 - daysSince);
              
              // Higher score for proper ship names
              if (shipName.match(/^[A-Z]/)) score += 20;
              if (!shipName.toLowerCase().includes('still')) score += 30;
              if (!shipName.toLowerCase().includes('onboard')) score += 30;
              if (shipName.split(' ').length <= 4) score += 20;
              
              if (score > bestScore) {
                bestScore = score;
                bestShipName = shipName;
              }
              
              console.log(`      Found: "${shipName}" (score: ${score})`);
            }
          }
        }
      }
      
      if (bestShipName) {
        console.log(`   ✅ Best match: "${bestShipName}" (score: ${bestScore})`);
        
        // Update the user's ship name
        await db.execute(`
          UPDATE users 
          SET current_ship_name = $1
          WHERE whatsapp_number = $2
        `, [bestShipName, user.whatsapp_number]);
        
        console.log(`   ✅ Updated ship name to: ${bestShipName}`);
      } else {
        console.log(`   ❌ No clear ship name found`);
      }
    }
    
    // Show final results
    console.log('\n\n📊 Final Results:');
    const finalUsers = await db.execute(`
      SELECT 
        full_name,
        current_ship_name,
        current_ship_imo
      FROM users
      WHERE onboard_status = 'ONBOARD'
      ORDER BY current_ship_name
    `);
    
    finalUsers.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name}: ${user.current_ship_name || 'Unknown'} ${user.current_ship_imo ? `(IMO: ${user.current_ship_imo})` : ''}`);
    });
    
  } catch (error) {
    console.error('Error extracting ship names:', error);
  } finally {
    process.exit(0);
  }
}

extractShipNamesFromMessages();