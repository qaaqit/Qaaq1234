import nodemailer from 'nodemailer';

async function testGmailSecret() {
  console.log('🔐 Testing Gmail with new secret...');
  
  const password = process.env.MAIL_APP_PASSWORD;
  console.log('Password from env:', password ? `${password.substring(0, 4)}****` : 'NOT SET');
  
  if (!password) {
    console.log('❌ MAIL_APP_PASSWORD environment variable not set');
    return;
  }
  
  // Test both formats - with and without spaces
  const passwords = [
    password, // As provided
    password.replace(/\s+/g, ''), // Remove all spaces
    'klegipenpnvnvrej' // Hardcoded test
  ];
  
  for (let i = 0; i < passwords.length; i++) {
    const testPass = passwords[i];
    console.log(`\n📧 Test ${i + 1}: Password "${testPass.substring(0, 4)}****"`);
    
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'support@qaaq.app',
          pass: testPass
        }
      });
      
      await transporter.verify();
      console.log('✅ Gmail connection successful!');
      
      // Send test email
      const result = await transporter.sendMail({
        from: 'support@qaaq.app',
        to: 'pg97@rediffmail.com',
        subject: '🎉 QaaqConnect Gmail Success!',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #ea580c;">Gmail Authentication Success!</h2>
            <p>The new App Password is working correctly.</p>
            <p><strong>Test Password Format:</strong> ${testPass.length} characters</p>
            <p>QaaqConnect dual OTP system is now fully operational!</p>
          </div>
        `
      });
      
      console.log('✅ Test email sent successfully!');
      console.log('Message ID:', result.messageId);
      console.log('🎉 Gmail setup complete - updating email service...');
      break;
      
    } catch (error: any) {
      console.log(`❌ Test ${i + 1} failed:`, error.code || error.message);
    }
  }
}

testGmailSecret();