import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

async function startQBotBabyLogin() {
  console.log('\n🚢 QBOTbaby WhatsApp Web Login');
  console.log('════════════════════════════════');
  console.log('📱 Phone: +905363694997');
  console.log('🔐 Logging into WhatsApp Web...\n');

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'qbotbaby-905363694997',
      dataPath: './qbotbaby-session'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    }
  });

  client.on('qr', (qr) => {
    console.log('📲 QR Code for +905363694997:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n📋 Instructions:');
    console.log('1. Open WhatsApp on phone +905363694997');
    console.log('2. Tap Settings → Linked Devices');
    console.log('3. Tap "Link a Device"');
    console.log('4. Scan the QR code above');
    console.log('5. QBOTbaby will be connected!\n');
  });

  client.on('ready', () => {
    console.log('✅ QBOTbaby (+905363694997) logged into WhatsApp Web!');
    console.log('🤖 Bot is ready to receive maritime questions');
    console.log('🔐 Session saved - future logins won\'t need QR scan');
    console.log('🌊 QBOTbaby is now online and ready!\n');
  });

  client.on('authenticated', () => {
    console.log('🔐 Authentication successful for +905363694997');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });

  client.on('message', async (message) => {
    if (message.fromMe || !message.from.includes('@c.us')) return;
    
    const contact = await message.getContact();
    const phoneNumber = contact.number;
    const messageText = message.body;
    
    console.log(`📨 Message from ${phoneNumber}: ${messageText}`);
    
    // Echo back for testing
    await message.reply(`🤖 QBOTbaby received: "${messageText}"`);
  });

  try {
    await client.initialize();
    console.log('🚀 QBOTbaby WhatsApp client initialized');
    
    // Keep running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down QBOTbaby...');
      await client.destroy();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to initialize QBOTbaby:', error);
    process.exit(1);
  }
}

startQBotBabyLogin();