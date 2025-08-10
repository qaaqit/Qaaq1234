// Simple script to rename database column using existing connection
const { execSync } = require('child_process');

try {
  console.log('🔄 Renaming database column...');
  
  // Use curl to make a request to our running server to execute the rename
  const result = execSync(`curl -X POST -H "Content-Type: application/json" -d '{"action":"rename_column"}' http://localhost:5000/api/admin/database-action`, { encoding: 'utf8' });
  
  console.log('✅ Column rename result:', result);
} catch (error) {
  console.error('❌ Error renaming column:', error.message);
}