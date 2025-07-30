import { notion, NOTION_PAGE_ID } from "./notion";

// Search for actual question content in QAAQ databases
async function findActualQuestions() {
  try {
    console.log('🔍 Searching for actual question content in QAAQ databases...\n');
    
    // Get all blocks/databases in the QAAQ workspace
    let hasMore = true;
    let startCursor = undefined;
    let allBlocks = [];
    
    while (hasMore) {
      const blocksResponse = await notion.blocks.children.list({
        block_id: NOTION_PAGE_ID,
        start_cursor: startCursor
      });
      
      allBlocks.push(...blocksResponse.results);
      hasMore = blocksResponse.has_more;
      startCursor = blocksResponse.next_cursor;
    }
    
    console.log(`Found ${allBlocks.length} total blocks in QAAQ workspace`);
    
    // Check each database for question content
    for (const block of allBlocks) {
      if (block.type === "child_database") {
        try {
          const dbInfo = await notion.databases.retrieve({
            database_id: block.id,
          });
          
          const title = dbInfo.title?.[0]?.plain_text || 'Untitled';
          const properties = Object.keys(dbInfo.properties || {});
          
          console.log(`\n📋 Database: ${title}`);
          console.log(`   Properties: ${properties.join(', ')}`);
          
          // Look for properties that might contain question text
          const questionProperties = properties.filter(prop => 
            prop.toLowerCase().includes('question') || 
            prop.toLowerCase().includes('title') ||
            prop.toLowerCase().includes('content') ||
            prop.toLowerCase().includes('text') ||
            prop.toLowerCase().includes('body') ||
            prop.toLowerCase().includes('message') ||
            prop.toLowerCase().includes('query')
          );
          
          if (questionProperties.length > 0) {
            console.log(`   🎯 Potential question properties: ${questionProperties.join(', ')}`);
            
            // Query the database to see actual content
            const contentResponse = await notion.databases.query({
              database_id: block.id,
              page_size: 10
            });
            
            console.log(`   📝 Found ${contentResponse.results.length} entries`);
            
            // Check the actual content of entries
            for (const [index, page] of contentResponse.results.slice(0, 3).entries()) {
              console.log(`\n   Entry ${index + 1}:`);
              
              for (const prop of questionProperties) {
                const propData = page.properties[prop];
                let content = '';
                
                if (propData?.title?.[0]?.plain_text) {
                  content = propData.title[0].plain_text;
                } else if (propData?.rich_text?.[0]?.plain_text) {
                  content = propData.rich_text[0].plain_text;
                } else if (propData?.select?.name) {
                  content = propData.select.name;
                }
                
                if (content && content.length > 3) {
                  console.log(`     ${prop}: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`);
                }
              }
            }
          }
          
        } catch (error) {
          console.log(`   ❌ Error accessing database ${block.id}:`, error.message);
        }
      }
    }
    
    // Also search in the parent workspace to see if there are other databases
    console.log('\n🔍 Searching for other potential question databases...');
    
    // Try to search in the broader Notion workspace
    try {
      const searchResponse = await notion.search({
        query: "questions",
        filter: {
          value: "database",
          property: "object"
        }
      });
      
      console.log(`Found ${searchResponse.results.length} databases matching "questions"`);
      
      for (const db of searchResponse.results.slice(0, 5)) {
        if (db.object === 'database') {
          const title = db.title?.[0]?.plain_text || 'Untitled';
          console.log(`  • ${title} (${db.id})`);
        }
      }
      
    } catch (searchError) {
      console.log('Search not available or restricted:', searchError.message);
    }
    
  } catch (error) {
    console.error('❌ Error searching for actual questions:', error);
  }
}

findActualQuestions();