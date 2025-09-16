import { pool } from "./db";
import { generateRfqSlugComponents, normalizePortSlug } from "./rfq-slug-utils";

/**
 * RFQ Slug Data Backfill Utility
 * 
 * This utility backfills slug data for existing RFQs that were created
 * before the slug system was implemented.
 */

interface LegacyRfq {
  id: string;
  userId: string;
  location: string;
  createdAt: Date;
}

/**
 * Backfill slug data for all RFQs missing slug fields
 */
export async function backfillRfqSlugs(options: {
  batchSize?: number;
  dryRun?: boolean;
  limit?: number;
} = {}): Promise<{
  processed: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  const { batchSize = 50, dryRun = false, limit } = options;
  
  console.log(`🔄 Starting RFQ slug backfill (${dryRun ? 'DRY RUN' : 'LIVE'})`);
  
  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    details: [] as string[]
  };

  try {
    // Find RFQs missing slug data
    let query = `
      SELECT id, user_id, location, created_at 
      FROM rfq_requests 
      WHERE port_slug IS NULL OR posted_date IS NULL OR user_public_id IS NULL OR serial IS NULL
      ORDER BY created_at ASC
    `;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const rfqsResult = await pool.query(query);
    const rfqs: LegacyRfq[] = rfqsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      location: row.location,
      createdAt: new Date(row.created_at)
    }));

    console.log(`📊 Found ${rfqs.length} RFQs requiring slug backfill`);

    // Process in batches
    for (let i = 0; i < rfqs.length; i += batchSize) {
      const batch = rfqs.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rfqs.length / batchSize)} (${batch.length} RFQs)`);

      for (const rfq of batch) {
        try {
          results.processed++;

          // Skip if location is missing
          if (!rfq.location?.trim()) {
            results.details.push(`⚠️ Skipped RFQ ${rfq.id}: Missing location`);
            continue;
          }

          // Generate slug components
          const slugComponents = await generateRfqSlugComponents(
            rfq.userId,
            rfq.location,
            rfq.createdAt
          );

          if (!dryRun) {
            // Update the RFQ with slug data
            await pool.query(`
              UPDATE rfq_requests 
              SET 
                port_slug = $2,
                posted_date = $3,
                user_public_id = $4,
                serial = $5,
                slug_version = 1
              WHERE id = $1
            `, [
              rfq.id,
              slugComponents.portSlug,
              slugComponents.postedDate,
              slugComponents.userPublicId,
              slugComponents.serial
            ]);
          }

          results.updated++;
          results.details.push(
            `✅ ${dryRun ? 'Would update' : 'Updated'} RFQ ${rfq.id}: ${slugComponents.portSlug}/${slugComponents.postedDate}/${slugComponents.userPublicId}/${slugComponents.serial}`
          );

        } catch (error) {
          results.errors++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.details.push(`❌ Error processing RFQ ${rfq.id}: ${errorMsg}`);
          console.error(`Error processing RFQ ${rfq.id}:`, error);
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < rfqs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Backfill complete! Processed: ${results.processed}, Updated: ${results.updated}, Errors: ${results.errors}`);
    
    return results;

  } catch (error) {
    console.error('Backfill process failed:', error);
    throw error;
  }
}

/**
 * Validate slug consistency for existing RFQs
 */
export async function validateRfqSlugs(): Promise<{
  total: number;
  withSlugs: number;
  withoutSlugs: number;
  duplicateSerials: number;
  invalidSlugs: number;
  details: string[];
}> {
  console.log('🔍 Validating RFQ slug consistency...');

  const results = {
    total: 0,
    withSlugs: 0,
    withoutSlugs: 0,
    duplicateSerials: 0,
    invalidSlugs: 0,
    details: [] as string[]
  };

  try {
    // Total RFQ count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM rfq_requests');
    results.total = parseInt(totalResult.rows[0].count);

    // RFQs with complete slug data
    const withSlugsResult = await pool.query(`
      SELECT COUNT(*) as count FROM rfq_requests 
      WHERE port_slug IS NOT NULL 
        AND posted_date IS NOT NULL 
        AND user_public_id IS NOT NULL 
        AND serial IS NOT NULL
    `);
    results.withSlugs = parseInt(withSlugsResult.rows[0].count);
    results.withoutSlugs = results.total - results.withSlugs;

    // Check for duplicate serials (should not exist)
    const duplicatesResult = await pool.query(`
      SELECT port_slug, posted_date, user_public_id, serial, COUNT(*) as count
      FROM rfq_requests 
      WHERE port_slug IS NOT NULL 
        AND posted_date IS NOT NULL 
        AND user_public_id IS NOT NULL 
        AND serial IS NOT NULL
      GROUP BY port_slug, posted_date, user_public_id, serial
      HAVING COUNT(*) > 1
    `);
    results.duplicateSerials = duplicatesResult.rows.length;

    if (results.duplicateSerials > 0) {
      results.details.push(`⚠️ Found ${results.duplicateSerials} duplicate serial combinations`);
      duplicatesResult.rows.forEach(row => {
        results.details.push(`   - ${row.port_slug}/${row.posted_date}/${row.user_public_id}/${row.serial} (${row.count} duplicates)`);
      });
    }

    // Check for invalid slug formats
    const invalidSlugsResult = await pool.query(`
      SELECT id, port_slug, user_public_id 
      FROM rfq_requests 
      WHERE port_slug IS NOT NULL 
        AND (
          port_slug !~ '^[a-z0-9-]+$' OR 
          user_public_id !~ '^[a-z0-9]+$'
        )
    `);
    results.invalidSlugs = invalidSlugsResult.rows.length;

    if (results.invalidSlugs > 0) {
      results.details.push(`⚠️ Found ${results.invalidSlugs} RFQs with invalid slug formats`);
    }

    console.log(`📊 Validation results:
    Total RFQs: ${results.total}
    With slugs: ${results.withSlugs} (${((results.withSlugs / results.total) * 100).toFixed(1)}%)
    Without slugs: ${results.withoutSlugs}
    Duplicate serials: ${results.duplicateSerials}
    Invalid slug formats: ${results.invalidSlugs}`);

    return results;

  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

/**
 * CLI interface for running backfill operations
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    try {
      switch (command) {
        case 'validate':
          await validateRfqSlugs();
          break;
          
        case 'backfill':
          const dryRun = args.includes('--dry-run');
          const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
          
          await backfillRfqSlugs({
            dryRun,
            limit: limit ? parseInt(limit) : undefined
          });
          break;
          
        default:
          console.log(`
Usage: npx tsx rfq-slug-backfill.ts <command>

Commands:
  validate              Validate slug consistency
  backfill [--dry-run] [--limit=N]  Backfill missing slug data

Examples:
  npx tsx rfq-slug-backfill.ts validate
  npx tsx rfq-slug-backfill.ts backfill --dry-run --limit=10
  npx tsx rfq-slug-backfill.ts backfill
          `);
      }
    } catch (error) {
      console.error('Command failed:', error);
      process.exit(1);
    }
  })();
}