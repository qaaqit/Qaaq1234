import { notion, NOTION_PAGE_ID } from "./notion";

async function checkNotionDatabases() {
  try {
    console.log('🔍 Checking Notion databases in page:', NOTION_PAGE_ID);
    
    // List child databases
    const response = await notion.blocks.children.list({
      block_id: NOTION_PAGE_ID,
    });

    console.log('\n📊 Found blocks:', response.results.length);
    
    const databases = [];
    
    for (const block of response.results) {
      if (block.type === "child_database") {
        console.log(`\n🗄️ Found database: ${block.id}`);
        try {
          const databaseInfo = await notion.databases.retrieve({
            database_id: block.id,
          });
          
          const title = databaseInfo.title?.[0]?.plain_text || 'Untitled';
          const properties = Object.keys(databaseInfo.properties || {});
          
          console.log(`  📋 Title: ${title}`);
          console.log(`  🏷️ Properties: ${properties.join(', ')}`);
          
          databases.push({
            id: block.id,
            title,
            properties
          });
          
          // If this looks like a questions database, query it
          if (title.toLowerCase().includes('question') || 
              title.toLowerCase().includes('qa') || 
              title.toLowerCase().includes('q&a')) {
            console.log(`\n🎯 Querying questions database: ${title}`);
            const questionsResponse = await notion.databases.query({
              database_id: block.id,
              page_size: 5
            });
            
            console.log(`  📝 Found ${questionsResponse.results.length} questions`);
            for (const page of questionsResponse.results.slice(0, 3)) {
              const pageProps = page.properties;
              const questionText = pageProps.Question?.title?.[0]?.plain_text || 
                                 pageProps.Title?.title?.[0]?.plain_text || 
                                 pageProps.Name?.title?.[0]?.plain_text || 'No title';
              console.log(`    • ${questionText.substring(0, 100)}...`);
            }
          }
          
        } catch (dbError) {
          console.error(`  ❌ Error retrieving database ${block.id}:`, dbError.message);
        }
      }
    }
    
    console.log(`\n✅ Total databases found: ${databases.length}`);
    return databases;
    
  } catch (error) {
    console.error('❌ Error checking Notion databases:', error.message);
    throw error;
  }
}

// Run the check
checkNotionDatabases()
  .then(() => {
    console.log('\n🎉 Notion database check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Notion database check failed:', error);
    process.exit(1);
  });