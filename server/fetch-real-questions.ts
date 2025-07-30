import { notion, NOTION_PAGE_ID } from "./notion";

// Check User Question Metrics database to find actual questions
async function fetchRealQuestions() {
  try {
    console.log('🔍 Fetching real question data from QAAQ Notion...');
    
    // First, check User Question Metrics database  
    const questionMetricsDbId = "23f533fe-2f81-8143-be0c-c6ac6dabaf51";
    
    console.log('\n📊 Querying User Question Metrics database...');
    const metricsResponse = await notion.databases.query({
      database_id: questionMetricsDbId,
      page_size: 10
    });
    
    console.log(`Found ${metricsResponse.results.length} user question records`);
    
    for (const page of metricsResponse.results.slice(0, 5)) {
      const props = page.properties;
      const fullName = props.FullName?.title?.[0]?.plain_text || 'No name';
      const totalQuestions = props.TotalQuestions?.number || 0;
      const whatsappQuestions = props.WhatsAppQuestions?.number || 0;
      const webQuestions = props.WebQuestions?.number || 0;
      const rank = props.MaritimeRank?.rich_text?.[0]?.plain_text || 'No rank';
      
      console.log(`  👤 ${fullName} (${rank}): ${totalQuestions} total questions (${whatsappQuestions} WhatsApp, ${webQuestions} Web)`);
    }
    
    // Now check the User Question Count Data database
    const questionCountDbId = "23f533fe-2f81-8191-b1e6-d6e1bfe9383f";
    
    console.log('\n📈 Querying User Question Count Data database...');
    const countResponse = await notion.databases.query({
      database_id: questionCountDbId,
      page_size: 10
    });
    
    console.log(`Found ${countResponse.results.length} question count records`);
    
    for (const page of countResponse.results.slice(0, 5)) {
      const props = page.properties;
      const fullName = props.FullName?.title?.[0]?.plain_text || 'No name';
      const totalQuestions = props.TotalQuestions?.number || 0;
      const userId = props.UserId?.rich_text?.[0]?.plain_text || 'No ID';
      
      console.log(`  📊 ${fullName} (ID: ${userId}): ${totalQuestions} questions`);
    }
    
    // Search for any database that might contain actual question content
    console.log('\n🔍 Searching for databases with question content...');
    
    // Check if there are more pages or child databases
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
    
    console.log(`Total blocks found: ${allBlocks.length}`);
    
    for (const block of allBlocks) {
      if (block.type === "child_database") {
        try {
          const dbInfo = await notion.databases.retrieve({
            database_id: block.id,
          });
          
          const title = dbInfo.title?.[0]?.plain_text || 'Untitled';
          const properties = Object.keys(dbInfo.properties || {});
          
          // Look for databases that might contain question content
          if (properties.some(prop => 
            prop.toLowerCase().includes('question') || 
            prop.toLowerCase().includes('content') ||
            prop.toLowerCase().includes('text') ||
            prop.toLowerCase().includes('body')
          )) {
            console.log(`\n🎯 Found potential questions database: ${title}`);
            console.log(`   Properties: ${properties.join(', ')}`);
            
            // Query this database for actual question content
            const content = await notion.databases.query({
              database_id: block.id,
              page_size: 3
            });
            
            for (const page of content.results) {
              console.log(`   📝 Sample entry:`, Object.keys(page.properties));
            }
          }
          
        } catch (error) {
          console.log(`   ❌ Error checking database ${block.id}:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching real questions:', error);
  }
}

fetchRealQuestions();