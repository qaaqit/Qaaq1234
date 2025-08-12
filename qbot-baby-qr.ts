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
    
    // Start the QBOTbaby WhatsApp service
    const qbotService = await startQBotWhatsApp('+905363694997');
    
    console.log('\n✅ QBOTbaby service initialized!');
    console.log('📲 QR Code will appear above for WhatsApp authentication');
    console.log('\n📋 Instructions:');
    console.log('1. Open WhatsApp on your phone (+905363694997)');
    console.log('2. Go to Settings → Linked Devices');
    console.log('3. Tap "Link a Device"');
    console.log('4. Scan the QR code that appears above');
    console.log('5. QBOTbaby will be ready to process maritime questions!');
    
    console.log('\n🎯 Once connected, QBOTbaby will:');
    console.log('   • Follow GrandMaster conversation rules');
    console.log('   • Process technical maritime questions');
    console.log('   • Provide AI-powered responses via OpenAI GPT-4o');
    console.log('   • Log all conversations to the database');
    console.log('   • Handle emergency maritime situations');
    
    console.log('\n⚡ QBOTbaby is now waiting for QR code scan...');
    console.log('📞 Ready to serve maritime professionals worldwide!');
    
    // Keep the service running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down QBOTbaby...');
      await qbotService.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start QBOTbaby QR code generator:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure you have the correct phone number access');
    console.log('2. Check your internet connection');
    console.log('3. Verify OpenAI API key is configured');
    console.log('4. Make sure PostgreSQL database is accessible');
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