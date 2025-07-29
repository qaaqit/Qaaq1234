import { notion, NOTION_PAGE_ID } from './notion';

async function testNotionAccess() {
    try {
        console.log('Testing Notion access...');
        console.log('Page ID:', NOTION_PAGE_ID);
        
        // First, try to get page info
        const page = await notion.pages.retrieve({ page_id: NOTION_PAGE_ID });
        console.log('Page retrieved successfully:', page.url);
        
        // Try to get child blocks/databases
        const blocks = await notion.blocks.children.list({
            block_id: NOTION_PAGE_ID,
        });
        
        console.log('Found blocks:', blocks.results.length);
        
        // Check each child database
        for (let i = 0; i < blocks.results.length; i++) {
            const block: any = blocks.results[i];
            console.log(`\nBlock ${i}: ${block.type} - ${block.id}`);
            
            if (block.type === 'child_database') {
                try {
                    // Get database info
                    const dbInfo = await notion.databases.retrieve({
                        database_id: block.id,
                    });
                    
                    const title = (dbInfo as any).title?.[0]?.plain_text || 'Untitled Database';
                    console.log(`  Database Title: ${title}`);
                    console.log(`  Properties:`, Object.keys((dbInfo as any).properties || {}));
                    
                    // Query the database
                    const dbQuery = await notion.databases.query({
                        database_id: block.id,
                    });
                    
                    console.log(`  Entries: ${dbQuery.results.length}`);
                    
                    // Check if this looks like the Q&A database
                    if (dbQuery.results.length > 0) {
                        const firstEntry: any = dbQuery.results[0];
                        const props = firstEntry.properties;
                        
                        console.log(`  Sample properties:`, Object.keys(props));
                        
                        // Look for question count indicators
                        const hasQuestionCount = Object.keys(props).some(key => 
                            key.toLowerCase().includes('question') || 
                            key.toLowerCase().includes('count') ||
                            key === '#'
                        );
                        
                        if (hasQuestionCount) {
                            console.log(`  *** This might be the Q&A database! ***`);
                            
                            // Show sample data
                            dbQuery.results.slice(0, 3).forEach((entry: any, idx) => {
                                const entryProps = entry.properties;
                                const name = entryProps.Name?.title?.[0]?.plain_text || 
                                           entryProps.Title?.title?.[0]?.plain_text || 'Unknown';
                                const count = entryProps.QuestionCount?.number || 
                                            entryProps['Question Count']?.number || 
                                            entryProps['#']?.number || 0;
                                            
                                console.log(`    ${name}: ${count} questions`);
                            });
                        }
                    }
                    
                } catch (dbError) {
                    console.log(`  Error accessing database:`, (dbError as Error).message);
                }
            }
        }
        
        // If page itself is a database, try to query it directly
        try {
            const dbQuery = await notion.databases.query({
                database_id: NOTION_PAGE_ID,
            });
            console.log('Database query successful! Found entries:', dbQuery.results.length);
            
            // Show first few entries
            dbQuery.results.slice(0, 3).forEach((entry: any, index) => {
                console.log(`Entry ${index}:`, Object.keys(entry.properties));
                
                // Try to extract name and count
                const props = entry.properties;
                const name = props.Name?.title?.[0]?.plain_text || 
                           props.Title?.title?.[0]?.plain_text || 'Unknown';
                const count = props.QuestionCount?.number || 
                            props['Question Count']?.number || 
                            props['#']?.number || 0;
                            
                console.log(`  ${name}: ${count} questions`);
            });
            
        } catch (dbError) {
            console.log('Page is not a database:', (dbError as Error).message);
        }
        
    } catch (error) {
        console.error('Notion access failed:', error);
    }
}

testNotionAccess();