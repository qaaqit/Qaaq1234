import { db } from './server/db';

async function analyzeWhatsAppShipsAndUpdateLocations() {
  try {
    console.log('🚢 Analyzing WhatsApp messages for ship information...\n');
    
    // First, get all users who are onboard
    const onboardQuery = await db.execute(`
      SELECT DISTINCT
        u.id,
        u.full_name,
        u.whatsapp_number,
        u.current_ship_name,
        u.current_ship_imo,
        u.onboard_status,
        u.rank,
        u.current_latitude,
        u.current_longitude
      FROM users u
      WHERE u.onboard_status = 'ONBOARD' 
         OR u.current_ship_name IS NOT NULL
      ORDER BY u.full_name
    `);
    
    console.log(`Found ${onboardQuery.rows.length} onboard users\n`);
    
    // Now check their WhatsApp messages for ship information
    const questionsQuery = await db.execute(`
      SELECT 
        q.user_name,
        q.question_text,
        q.answer_text,
        q.created_at,
        u.whatsapp_number,
        u.current_ship_name
      FROM questions q
      JOIN users u ON (
        u.whatsapp_number = q.user_name 
        OR u.full_name = q.user_name
        OR u.id::text = q.user_name
      )
      WHERE (
        q.question_text ILIKE '%ship%' 
        OR q.question_text ILIKE '%vessel%'
        OR q.question_text ILIKE '%mv %'
        OR q.question_text ILIKE '%mt %'
        OR q.question_text ILIKE '%onboard%'
        OR q.question_text ILIKE '%sailing%'
        OR q.answer_text ILIKE '%ship%'
        OR q.answer_text ILIKE '%vessel%'
      )
      AND q.created_at > NOW() - INTERVAL '3 months'
      ORDER BY q.created_at DESC
      LIMIT 100
    `);
    
    console.log(`Found ${questionsQuery.rows.length} ship-related messages\n`);
    
    // Extract ship names from messages
    const shipPatterns = [
      /(?:on|aboard|vessel|ship|mv|mt|m\.v\.|m\.t\.)\s+([A-Z][A-Za-z0-9\s\-]+)/gi,
      /([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)(?:\s+ship|\s+vessel)/gi,
      /IMO\s*[:]\s*(\d{7})/gi
    ];
    
    const extractedShips = new Map();
    
    for (const msg of questionsQuery.rows) {
      const text = `${msg.question_text || ''} ${msg.answer_text || ''}`;
      
      for (const pattern of shipPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const shipName = match[1]?.trim();
          if (shipName && shipName.length > 3 && shipName.length < 50) {
            const userKey = msg.whatsapp_number || msg.user_name;
            if (!extractedShips.has(userKey)) {
              extractedShips.set(userKey, []);
            }
            extractedShips.get(userKey).push({
              shipName,
              messageDate: msg.created_at,
              messageSnippet: text.substring(0, 100)
            });
          }
        }
      }
    }
    
    console.log('\n📋 Ship names extracted from WhatsApp messages:');
    for (const [user, ships] of extractedShips) {
      console.log(`\nUser: ${user}`);
      const uniqueShips = [...new Set(ships.map(s => s.shipName))];
      uniqueShips.forEach(ship => {
        console.log(`  - ${ship}`);
      });
    }
    
    // Now update database with extracted ship names where missing
    for (const [userWhatsApp, ships] of extractedShips) {
      if (ships.length > 0) {
        // Get the most recent ship mention
        const latestShip = ships[0].shipName;
        
        // Update user if they don't have a ship name
        await db.execute(`
          UPDATE users 
          SET current_ship_name = $1
          WHERE whatsapp_number = $2 
            AND (current_ship_name IS NULL OR current_ship_name = '')
        `, [latestShip, userWhatsApp]);
      }
    }
    
    console.log('\n✅ Database updated with extracted ship names');
    
  } catch (error) {
    console.error('Error analyzing WhatsApp ships:', error);
  } finally {
    process.exit(0);
  }
}

analyzeWhatsAppShipsAndUpdateLocations();