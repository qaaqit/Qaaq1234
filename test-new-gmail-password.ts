/**
 * Quick test script for new Gmail App Password
 * Usage: npx tsx test-new-gmail-password.ts YOUR_NEW_APP_PASSWORD
 */

import nodemailer from 'nodemailer';

const newPassword = process.argv[2];

if (!newPassword) {
  console.log('Usage: npx tsx test-new-gmail-password.ts YOUR_NEW_APP_PASSWORD');
  console.log('Example: npx tsx test-new-gmail-password.ts abcdefghijklmnop');
  process.exit(1);
}

async function testNewPassword() {
  console.log('🧪 Testing new Gmail App Password...');
  console.log(`Password: ${newPassword.substring(0, 4)}****`);
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'support@qaaq.app',
        pass: newPassword
      }
    });
    
    // Test connection
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Send test email
    const result = await transporter.sendMail({
      from: 'support@qaaq.app',
      to: 'pg97@rediffmail.com',
      subject: '🔐 QaaqConnect - Gmail Test Success',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #ea580c;">Gmail Setup Successful!</h2>
          <p>This test email confirms that the Gmail SMTP configuration is working correctly for QaaqConnect.</p>
          <p><strong>Test Code:</strong> 123456</p>
          <p style="color: #6b7280;">QaaqConnect - Connecting Maritime Professionals Worldwide</p>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('\n🔧 Ready to update email service with this password!');
    
  } catch (error: any) {
    console.log('❌ Test failed:', error.code || error.message);
    if (error.response) {
      console.log('Gmail Response:', error.response);
    }
  }
}

testNewPassword();