import { startQBotWhatsApp } from './server/whatsapp-service';

async function generateQBotBabyQR() {
  try {
    console.log('\n🚢 QBOTbaby WhatsApp Authentication');
    console.log('═══════════════════════════════════════');
    console.log('📱 Phone Number: +905363694997');
    console.log('🤖 Bot Name: QBOTbaby');
    console.log('🔧 Integration: Direct WhatsApp Web.js');
    console.log('🧠 AI: OpenAI GPT-4o with GrandMaster rules');
    console.log('═══════════════════════════════════════\n');

    console.log('🚀 Starting QBOTbaby service...');
    console.log('📲 QR Code will appear below - scan with WhatsApp!');
    console.log('⚡ Initializing WhatsApp Web.js client (like parent app)...\n');
    
    // Start the QBOTbaby WhatsApp service - this will show QR code
    const qbotService = await startQBotWhatsApp('+905363694997');
    
    console.log('\n🎯 Once QR code is scanned, QBOTbaby will:');
    console.log('   • Follow GrandMaster conversation rules');
    console.log('   • Process technical maritime questions');
    console.log('   • Provide AI-powered responses via OpenAI GPT-4o');
    console.log('   • Log all conversations to the database');
    console.log('   • Handle emergency maritime situations');
    console.log('   • Save session for permanent 24/7 availability');
    
    console.log('\n📞 QBOTbaby ready to serve maritime professionals worldwide!');
    console.log('💾 After first QR scan, future restarts will NOT require QR scan');
    
    // Keep the service running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down QBOTbaby...');
      await qbotService.stop();
      process.exit(0);
    });
    
    // Keep running indefinitely
    setInterval(() => {
      if (qbotService.isReady) {
        console.log(`💚 QBOTbaby heartbeat: ${new Date().toLocaleString()} - Ready for maritime assistance`);
      }
    }, 300000); // Every 5 minutes
    
    // Keep process alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Failed to start QBOTbaby QR code generator:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure whatsapp-web.js package is installed');
    console.log('2. Check your internet connection');
    console.log('3. Verify OpenAI API key is configured in environment');
    console.log('4. Make sure PostgreSQL database is accessible');
    console.log('5. Ensure phone +905363694997 has WhatsApp installed');
    console.log('6. Try clearing ./qbotbaby-session directory if authentication fails');
    process.exit(1);
  }
}

// Display banner and start
console.log('');
console.log('████████████████████████████████████████');
console.log('█  🚢 QBOTbaby WhatsApp Authentication █');
console.log('█  📱 +905363694997                    █');
console.log('█  🤖 Maritime Technical Assistant     █');
console.log('████████████████████████████████████████');
console.log('');

generateQBotBabyQR();