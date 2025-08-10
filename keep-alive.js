// Keep-alive script to prevent cold starts on Replit Autoscale Deployments
// This script pings the health endpoint periodically to keep the service warm

const PRODUCTION_URL = 'https://qaaq.app';
const HEALTH_ENDPOINT = '/health';
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

async function pingHealth() {
  try {
    const response = await fetch(`${PRODUCTION_URL}${HEALTH_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'QAAQ-KeepAlive-Bot/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Health check successful - Uptime: ${Math.floor(data.uptime)}s`);
    } else {
      console.log(`⚠️ Health check returned ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
}

// Only run keep-alive in production environment
if (process.env.NODE_ENV === 'production') {
  console.log('🔄 Starting keep-alive service...');
  pingHealth(); // Initial ping
  
  setInterval(pingHealth, PING_INTERVAL);
  console.log(`⏰ Keep-alive pings scheduled every ${PING_INTERVAL / 60000} minutes`);
} else {
  console.log('⏸️ Keep-alive disabled in development');
}