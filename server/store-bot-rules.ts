import { pool } from './db';
import fs from 'fs';

async function storeBotRules() {
  try {
    const client = await pool.connect();
    
    // Read the bot rules file
    const botRulesContent = fs.readFileSync('./QBOTRULESV1.md', 'utf8');
    
    console.log('Storing enhanced QBOT rules with ship name extraction...');
    
    // Insert or update the bot rules in the database
    const result = await client.query(`
      INSERT INTO bot_documentation (
        bot_name, 
        version, 
        rules_content, 
        last_updated,
        features
      ) VALUES (
        'QBOT', 
        'V1.1_SHIP_EXTRACTION', 
        $1, 
        NOW(),
        ARRAY['ship_name_extraction', 'onboard_status_detection', 'maritime_pattern_matching']
      )
      ON CONFLICT (bot_name, version) 
      DO UPDATE SET 
        rules_content = EXCLUDED.rules_content,
        last_updated = NOW(),
        features = EXCLUDED.features
      RETURNING id, bot_name, version
    `, [botRulesContent]);
    
    if (result.rows.length > 0) {
      const rule = result.rows[0];
      console.log(`✅ Successfully stored ${rule.bot_name} ${rule.version} rules`);
      console.log(`📋 Rule ID: ${rule.id}`);
      
      // Add example patterns to the database
      await client.query(`
        INSERT INTO bot_documentation (
          bot_name, 
          version, 
          rules_content, 
          last_updated,
          features
        ) VALUES (
          'QBOT_PATTERNS', 
          'SHIP_NAME_EXTRACTION', 
          $1, 
          NOW(),
          ARRAY['regex_patterns', 'natural_language_processing']
        )
        ON CONFLICT (bot_name, version) 
        DO UPDATE SET 
          rules_content = EXCLUDED.rules_content,
          last_updated = NOW()
      `, [
        `# Ship Name Extraction Patterns

## Supported Conversation Patterns:
1. "Hi, I am Harshal Jichkar 4E currently on federal kumano"
2. "I'm working on MV Ocean Star"
3. "Our ship is Atlantic Voyager"
4. "Aboard the vessel Pacific Dawn"
5. "Ship name is Mediterranean Explorer"
6. "Sailing on Northern Lights"
7. "Currently stationed on Baltic Merchant"

## Regular Expression Patterns:
- /(?:currently\\s+on|on\\s+(?:the\\s+)?|aboard\\s+(?:the\\s+)?|ship\\s+|vessel\\s+|mv\\s+|ms\\s+)([a-zA-Z0-9\\s\\-]+)/gi
- /(?:sailing\\s+on|working\\s+on|stationed\\s+on)\\s+([a-zA-Z0-9\\s\\-]+)/gi
- /(?:my\\s+ship\\s+is|our\\s+ship\\s+is|ship\\s+name\\s+is)\\s+([a-zA-Z0-9\\s\\-]+)/gi

## Database Updates:
- current_ship_name: Extracted ship name
- last_ship: Same as current_ship_name
- onboard_status: Automatically set to 'ONBOARD'`
      ]);
      
      console.log('📊 Added ship name extraction patterns to database');
    }
    
    client.release();
    console.log('\n🎉 Bot rules successfully updated with ship name extraction capabilities!');
    
  } catch (error) {
    console.error('❌ Error storing bot rules:', error);
  }
}

storeBotRules();