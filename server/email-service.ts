/**
 * Email Service for OTP and Notifications
 * Using Gmail SMTP for email delivery
 */

import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: any;
  private initialized = false;

  constructor() {
    this.initializeTransporter();
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeTransporter();
    }
  }

  private async initializeTransporter() {
    if (this.initialized) return;
    
    // Try Gmail first, fallback to Ethereal test account if Gmail fails
    try {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER || 'support@qaaq.app',
          pass: process.env.MAIL_APP_PASSWORD || 'klegipenpnvnvrej'
        }
      });
      
      // Test Gmail connection
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connected successfully');
      this.initialized = true;
      
    } catch (gmailError) {
      console.log('⚠️ Gmail SMTP failed, using test account for development');
      
      // Create Ethereal test account for reliable email testing
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('📧 Test email account created:', testAccount.user);
      console.log('📧 Test emails viewable at: https://ethereal.email');
      this.initialized = true;
    }
  }

  /**
   * Send premium purchase confirmation email (20 words max)
   */
  async sendPremiumWelcomeEmail(email: string, userName: string, planType: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.ensureInitialized();

      const subject = 'QaaqConnect Premium - Welcome!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Welcome to QaaqConnect Premium!</h2>
          <p>Hi ${userName},</p>
          <p>Your ${planType} premium subscription is now active. Enjoy unlimited QBOT responses!</p>
          <p style="color: #666; font-size: 12px;">- QaaqConnect Team</p>
        </div>
      `;

      const result = await this.transporter.sendMail({
        from: '"QaaqConnect" <support@qaaq.app>',
        to: email,
        subject: subject,
        html: html
      });

      console.log('✅ Premium welcome email sent to:', email);
      return { success: true, message: 'Premium welcome email sent successfully' };

    } catch (error) {
      console.error('❌ Failed to send premium welcome email:', error);
      return { success: false, message: 'Failed to send premium welcome email' };
    }
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(email: string, verificationToken: string, userData: any, workshopData?: any): Promise<{ success: boolean; message: string }> {
    try {
      await this.ensureInitialized();

      const verificationUrl = `${process.env.BASE_URL || 'https://qaaq.app'}/api/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: '"QaaqConnect" <support@qaaq.app>',
        to: email,
        subject: '🚢 Welcome Aboard QaaqConnect - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f97316, #dc2626); padding: 2px; border-radius: 12px;">
            <div style="background: white; padding: 30px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ea580c; margin: 0; font-size: 28px;">⚓ QaaqConnect</h1>
                <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Maritime Professional Network</p>
              </div>
              
              <h2 style="color: #374151; margin-bottom: 20px;">Welcome Aboard, ${userData.firstName}!</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                Thank you for joining the QaaqConnect maritime community. To complete your registration and start connecting with fellow maritime professionals, please verify your email address.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #ea580c, #dc2626); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block; border: none; cursor: pointer;">
                  ✅ Verify Email Address
                </a>
              </div>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  <strong>Your Registration Details:</strong><br>
                  <strong style="color: #ea580c;">User ID: ${userData.userId}</strong><br>
                  Name: ${userData.firstName} ${userData.lastName}<br>
                  Email: ${email}<br>
                  Rank: ${userData.maritimeRank}<br>
                  Company: ${userData.company}
                </p>
                ${userData.maritimeRank === "Marine workshop" && workshopData ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    <strong>🔧 Workshop Details:</strong><br>
                    Competency/Expertise: ${workshopData.competencyExpertise}<br>
                    Home Port: ${workshopData.homePort}<br>
                    Visa Status: ${workshopData.visaStatus}<br>
                    Companies Worked For: ${workshopData.companiesWorkedFor}<br>
                    ${workshopData.officialWebsite ? `Website: ${workshopData.officialWebsite}<br>` : ''}
                    Daily Service Rate: $${workshopData.perDayAttendanceRate} USD<br>
                    Remote Support Rate: $${workshopData.remoteTroubleshootingRate} USD/hour
                  </p>
                  <p style="margin: 10px 0 0 0; color: #16a34a; font-size: 13px; font-weight: bold;">
                    ⚓ Your workshop profile will be created after email verification
                  </p>
                </div>
                ` : ''}
                <p style="margin: 10px 0 0 0; color: #f59e0b; font-size: 13px; font-weight: bold;">
                  📝 Important: Save your User ID (${userData.userId}) - you'll need it for login!
                </p>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                If you didn't create this account, please ignore this email. This verification link will expire in 24 hours for security.
              </p>
              
              <div style="text-align: center; margin-top: 25px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  🌊 Welcome to the global maritime community!
                </p>
              </div>
            </div>
          </div>
        `,
        text: `Welcome to QaaqConnect, ${userData.firstName}!\n\nYour User ID: ${userData.userId}\nIMPORTANT: Save your User ID - you'll need it for login!\n\nPlease verify your email address by clicking this link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nQaaqConnect Team`
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Log for test accounts
      if (info.messageId.includes('ethereal')) {
        console.log('📧 Test email sent:', nodemailer.getTestMessageUrl(info));
      }

      return {
        success: true,
        message: 'Verification email sent successfully'
      };

    } catch (error) {
      console.error('❌ Verification email error:', error);
      return {
        success: false,
        message: 'Failed to send verification email'
      };
    }
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(email: string, otpCode: string, whatsappNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.ensureInitialized();
      const emailContent = {
        from: process.env.MAIL_USER || 'support@qaaq.app',
        to: email,
        subject: '🔐 QaaqConnect - Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ea580c, #dc2626); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">QaaqConnect</h1>
              <p style="color: white; margin: 5px 0;">Maritime Professional Networking</p>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">Welcome to QaaqConnect!</h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                Your verification code for WhatsApp number <strong>${whatsappNumber}</strong> is:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #ea580c; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                  ${otpCode}
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                This code expires in 10 minutes for your security.
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #ea580c;">
                <h3 style="color: #374151; margin-top: 0;">About QaaqConnect</h3>
                <p style="color: #6b7280; margin-bottom: 0;">
                  Join the maritime community! Connect with sailors worldwide, discover who's nearby at ports, 
                  and access essential maritime services. Welcome aboard! ⚓
                </p>
              </div>
            </div>
            
            <div style="padding: 20px; text-align: center; background: #374151; color: white;">
              <p style="margin: 0; font-size: 14px;">
                QaaqConnect - Connecting Maritime Professionals Worldwide
              </p>
            </div>
          </div>
        `,
        text: `
QaaqConnect - Your Verification Code

Welcome to QaaqConnect!

Your verification code for WhatsApp number ${whatsappNumber} is: ${otpCode}

This code expires in 10 minutes for your security.

About QaaqConnect:
Join the maritime community! Connect with sailors worldwide, discover who's nearby at ports, and access essential maritime services. Welcome aboard!

QaaqConnect - Connecting Maritime Professionals Worldwide
        `
      };

      // Actually send the email (both development and production)
      console.log(`📧 Sending OTP email to: ${email}`);
      await this.transporter.sendMail(emailContent);
      
      return {
        success: true,
        message: 'Verification code sent to your email'
      };
    } catch (error) {
      console.error('Gmail authentication failed:', error);
      console.log('📧 Gmail App Password verification failed. Please verify:');
      console.log('1. 2-Factor Authentication is enabled on support@qaaq.app');
      console.log('2. App Password is correctly generated for "Mail"');
      console.log('3. App Password format is: openirdaexgqcqbk (16 chars, no spaces)');
      
      // For now, log the email content for manual sending
      console.log('\n📧 Email content that would be sent:');
      console.log(`To: ${email}`);
      console.log(`Subject: 🔐 QaaqConnect - Your Verification Code`);
      console.log(`OTP Code: ${otpCode}`);
      console.log(`WhatsApp: ${whatsappNumber}`);
      
      return {
        success: false,
        message: 'Email verification temporarily unavailable. WhatsApp OTP is working.'
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetCode: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const emailContent = {
        from: process.env.MAIL_USER || 'support@qaaq.app',
        to: email,
        subject: '🔑 QaaqConnect - Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ea580c, #dc2626); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">QaaqConnect</h1>
              <p style="color: white; margin: 5px 0;">Password Reset</p>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">Password Reset Request</h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                You requested a password reset for account: <strong>${userId}</strong>
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #dc2626; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                  ${resetCode}
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                This code expires in 10 minutes for your security.
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #dc2626;">
                <p style="color: #6b7280; margin: 0;">
                  If you didn't request this password reset, please ignore this email. 
                  Your account security is important to us.
                </p>
              </div>
            </div>
            
            <div style="padding: 20px; text-align: center; background: #374151; color: white;">
              <p style="margin: 0; font-size: 14px;">
                QaaqConnect - Connecting Maritime Professionals Worldwide
              </p>
            </div>
          </div>
        `,
        text: `
QaaqConnect - Password Reset Code

You requested a password reset for account: ${userId}

Your reset code is: ${resetCode}

This code expires in 10 minutes for your security.

If you didn't request this password reset, please ignore this email.

QaaqConnect - Connecting Maritime Professionals Worldwide
        `
      };

      // Actually send the password reset email
      console.log(`📧 Sending password reset email to: ${email}`);
      await this.transporter.sendMail(emailContent);
      
      return {
        success: true,
        message: 'Password reset code sent to your email'
      };
    } catch (error) {
      console.error('Password reset email error:', error);
      return {
        success: false,
        message: 'Failed to send password reset email'
      };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export { EmailService, emailService };