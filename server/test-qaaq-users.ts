import { notion } from './notion';

async function testQAAQUsers() {
    try {
        console.log('Testing direct access to QAAQ Maritime Users database...');
        
        const QAAQ_USERS_DB_ID = '23e533fe-2f81-8147-85e6-ede63f27b0f5';
        
        const response = await notion.databases.query({
            database_id: QAAQ_USERS_DB_ID,
            page_size: 10,
        });

        console.log(`Found ${response.results.length} entries`);
        
        response.results.forEach((page: any, index) => {
            const props = page.properties;
            
            const name = props.Name?.title?.[0]?.plain_text || 'No Name';
            const questionCount = props.QuestionCount?.number ?? 'null';
            const answerCount = props.AnswerCount?.number ?? 'null';
            const rank = props.MaritimeRank?.select?.name || 'No Rank';
            const whatsapp = props.WhatsAppNumber?.phone_number || 'No WhatsApp';
            
            console.log(`Entry ${index + 1}:`);
            console.log(`  Name: ${name}`);
            console.log(`  Rank: ${rank}`);
            console.log(`  WhatsApp: ${whatsapp}`);
            console.log(`  Questions: ${questionCount}`);
            console.log(`  Answers: ${answerCount}`);
            console.log('---');
        });
        
    } catch (error) {
        console.error('Error accessing QAAQ Users database:', error);
    }
}

testQAAQUsers();