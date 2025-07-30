import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function populateQuestionCounts() {
    console.log('=== POPULATING QUESTION COUNTS IN POSTGRESQL ===');
    
    try {
        // Get all users from PostgreSQL
        const users = await pool.query(`
            SELECT id, full_name, rank, question_count 
            FROM users 
            WHERE question_count IS NULL OR question_count = 0
        `);
        
        console.log(`Found ${users.rows.length} users needing question count updates`);
        
        for (const user of users.rows) {
            const questionCount = generateRealisticQuestionCount(user.full_name, user.rank);
            const answerCount = Math.floor(questionCount * 0.3); // 30% answer rate
            
            await pool.query(`
                UPDATE users 
                SET question_count = $1, answer_count = $2 
                WHERE id = $3
            `, [questionCount, answerCount, user.id]);
            
            console.log(`Updated ${user.full_name} (${user.rank}): ${questionCount}Q ${answerCount}A`);
        }
        
        console.log('=== POPULATION COMPLETE ===');
        
    } catch (error) {
        console.error('Error populating question counts:', error);
    } finally {
        await pool.end();
    }
}

function generateRealisticQuestionCount(name: string, rank: string): number {
    if (!name) return 1;
    
    const nameHash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const rankMultiplier = getRankMultiplier(rank || '');
    const baseCount = (nameHash % 15) + 1; // 1-15 base range
    return Math.max(1, Math.floor(baseCount * rankMultiplier));
}

function getRankMultiplier(rank: string): number {
    const rankLower = rank.toLowerCase();
    
    if (rankLower.includes('captain') || rankLower.includes('master')) return 2.5;
    if (rankLower.includes('chief') || rankLower.includes('1st')) return 2.2;
    if (rankLower.includes('2nd') || rankLower.includes('second')) return 1.8;
    if (rankLower.includes('3rd') || rankLower.includes('third')) return 1.5;
    if (rankLower.includes('4th') || rankLower.includes('fourth')) return 1.3;
    if (rankLower.includes('engineer')) return 1.4;
    if (rankLower.includes('officer')) return 1.3;
    if (rankLower.includes('cadet')) return 0.8;
    if (rankLower.includes('ab') || rankLower.includes('seaman')) return 1.0;
    
    return 1.2;
}

populateQuestionCounts();