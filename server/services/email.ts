import nodemailer from 'nodemailer';

// Create reusable transporter object using Gmail SMTP
const createTransporter = () => {
  // For production, use Gmail with App Password
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  
  // For development/testing, use Ethereal Email (fake SMTP service)
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
};

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@qaaqconnect.com',
      to: email,
      subject: 'QaaqConnect - Verify Your Account',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 30px;">
            <div style="background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="font-size: 24px; color: white;">⚓</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">QaaqConnect</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Maritime Community</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 8px 32px rgba(30, 58, 138, 0.12);">
            <h2 style="color: #1e3a8a; margin: 0 0 16px 0; font-size: 24px;">Welcome aboard! 🚢</h2>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for joining QaaqConnect. To complete your registration and start discovering amazing port experiences, please verify your email with the code below:
            </p>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">Your verification code:</p>
              <div style="font-size: 32px; font-weight: bold; color: #1e3a8a; font-family: monospace; letter-spacing: 4px;">
                ${code}
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                QaaqConnect - Connecting sailors with locals worldwide<br>
                Part of the QAAQ Maritime Platform
              </p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}
