import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Merge duplicate maritime definitions
async function mergeDuplicateDefinitions() {
  const pool = new Pool({ 
    connectionString: 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔍 Finding duplicate maritime definitions...');
    
    // Get all glossary entries with extracted terms
    const result = await pool.query(`
      SELECT 
        q.id,
        q.content as question,
        a.content as answer,
        q.created_at,
        CASE 
          WHEN LOWER(q.content) LIKE '%what is a %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is a ' IN LOWER(q.content)) + 9), '?', ''))
          WHEN LOWER(q.content) LIKE '%what is an %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is an ' IN LOWER(q.content)) + 10), '?', ''))
          WHEN LOWER(q.content) LIKE '%what is the %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is the ' IN LOWER(q.content)) + 11), '?', ''))
          WHEN LOWER(q.content) LIKE '%what is %' THEN TRIM(REPLACE(SUBSTRING(q.content FROM POSITION('what is ' IN LOWER(q.content)) + 8), '?', ''))
          ELSE q.content
        END as extracted_term
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      WHERE LOWER(q.content) LIKE '%what is%'
        AND a.content IS NOT NULL
        AND LENGTH(a.content) > 10
        AND q.content NOT LIKE '%[ARCHIVED]%'
      ORDER BY extracted_term ASC
    `);
    
    console.log(`📚 Found ${result.rows.length} total glossary entries`);
    
    // Group by normalized term
    const termGroups: { [key: string]: any[] } = {};
    
    result.rows.forEach(row => {
      const normalizedTerm = row.extracted_term.toLowerCase()
        .replace(/[?.,!]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!termGroups[normalizedTerm]) {
        termGroups[normalizedTerm] = [];
      }
      termGroups[normalizedTerm].push(row);
    });
    
    // Find duplicates
    const duplicateGroups = Object.entries(termGroups)
      .filter(([term, entries]) => entries.length > 1);
    
    console.log(`🔗 Found ${duplicateGroups.length} terms with duplicates`);
    
    let mergedCount = 0;
    let archivedCount = 0;
    
    for (const [term, entries] of duplicateGroups) {
      console.log(`\n📝 Processing: ${term.toUpperCase()} (${entries.length} duplicates)`);
      
      // Sort by answer quality and recency
      entries.sort((a, b) => {
        // Prefer longer, more detailed answers
        const aScore = a.answer.length + (a.answer.includes('•') ? 100 : 0);
        const bScore = b.answer.length + (b.answer.includes('•') ? 100 : 0);
        
        if (Math.abs(aScore - bScore) > 50) {
          return bScore - aScore; // Better answer first
        }
        
        // If similar quality, prefer newer
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      const bestEntry = entries[0];
      const duplicatesToArchive = entries.slice(1);
      
      console.log(`  ✅ Keeping: ID ${bestEntry.id} (${bestEntry.answer.length} chars)`);
      console.log(`  📦 Archiving: ${duplicatesToArchive.length} duplicates`);
      
      // Archive duplicate entries
      for (const duplicate of duplicatesToArchive) {
        try {
          await pool.query(`
            UPDATE questions 
            SET content = content || ' [ARCHIVED-DUPLICATE]'
            WHERE id = $1 AND content NOT LIKE '%[ARCHIVED]%'
          `, [duplicate.id]);
          
          archivedCount++;
          console.log(`    🗃️ Archived: ID ${duplicate.id}`);
        } catch (error) {
          console.error(`    ❌ Failed to archive ID ${duplicate.id}:`, error.message);
        }
      }
      
      mergedCount++;
    }
    
    console.log(`\n✅ Merge completed!`);
    console.log(`📊 Summary:`);
    console.log(`  - ${mergedCount} terms processed`);
    console.log(`  - ${archivedCount} duplicate entries archived`);
    console.log(`  - Dictionary now has ${result.rows.length - archivedCount} unique terms`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Merge failed:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly  
mergeDuplicateDefinitions()
  .then(() => {
    console.log('🎉 Duplicate merge completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Duplicate merge failed:', error);
    process.exit(1);
  });

export { mergeDuplicateDefinitions };