/**
 * Password Management System
 * Handles individual user passwords and liberal login tracking
 * Compatible with existing QAAQ database schema
 */

interface UserPasswordData {
  userId: string;
  customPassword?: string;
  hasSetCustomPassword: boolean;
  liberalLoginCount: number;
  lastLiberalLogin?: Date;
  resetCode?: string;
  resetCodeExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class PasswordManager {
  private passwords = new Map<string, UserPasswordData>();
  private readonly LIBERAL_PASSWORD = '1234koihai';

  /**
   * Initialize password data for a user
   */
  initializeUser(userId: string): UserPasswordData {
    if (!this.passwords.has(userId)) {
      const userData: UserPasswordData = {
        userId,
        hasSetCustomPassword: false,
        liberalLoginCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.passwords.set(userId, userData);
      return userData;
    }
    return this.passwords.get(userId)!;
  }

  /**
   * Handle password validation with liberal login logic
   */
  validatePassword(userId: string, inputPassword: string): {
    isValid: boolean;
    requiresPasswordSetup: boolean;
    message: string;
  } {
    const userData = this.initializeUser(userId);

    // If user has set custom password, validate against it
    if (userData.hasSetCustomPassword && userData.customPassword) {
      const isValid = inputPassword === userData.customPassword;
      return {
        isValid,
        requiresPasswordSetup: false,
        message: isValid ? 'Login successful' : 'Invalid password'
      };
    }

    // Liberal login logic
    if (inputPassword === this.LIBERAL_PASSWORD) {
      if (userData.liberalLoginCount === 0) {
        // First-time liberal login - allow and track
        userData.liberalLoginCount++;
        userData.lastLiberalLogin = new Date();
        userData.updatedAt = new Date();
        this.passwords.set(userId, userData);

        return {
          isValid: true,
          requiresPasswordSetup: true,
          message: 'First-time liberal login successful. Please set your password.'
        };
      } else {
        // Liberal password already used
        return {
          isValid: false,
          requiresPasswordSetup: false,
          message: 'Liberal password has already been used. Please use your custom password or contact support.'
        };
      }
    }

    // Check if they're trying to use their custom password (if set but not validated above)
    if (userData.customPassword && inputPassword === userData.customPassword) {
      return {
        isValid: true,
        requiresPasswordSetup: false,
        message: 'Login successful'
      };
    }

    return {
      isValid: false,
      requiresPasswordSetup: false,
      message: 'Invalid credentials'
    };
  }

  /**
   * Set custom password for user
   */
  setCustomPassword(userId: string, newPassword: string): { success: boolean; message: string } {
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long' };
    }

    if (newPassword === this.LIBERAL_PASSWORD) {
      return { success: false, message: 'Cannot use the liberal login password as your custom password' };
    }

    // Update user data
    const userData = this.initializeUser(userId);
    userData.customPassword = newPassword;
    userData.hasSetCustomPassword = true;
    userData.updatedAt = new Date();
    this.passwords.set(userId, userData);

    console.log(`✅ Password set for user ${userId}`);
    return { success: true, message: 'Password set successfully' };
  }

  /**
   * Get user password status
   */
  getUserStatus(userId: string): {
    hasCustomPassword: boolean;
    liberalLoginCount: number;
    canUseLiberalLogin: boolean;
  } {
    const userData = this.initializeUser(userId);
    return {
      hasCustomPassword: userData.hasSetCustomPassword,
      liberalLoginCount: userData.liberalLoginCount,
      canUseLiberalLogin: userData.liberalLoginCount === 0
    };
  }

  /**
   * Reset user password (admin function)
   */
  resetUser(userId: string): { success: boolean; message: string } {
    this.passwords.delete(userId);
    return { success: true, message: 'User password data reset successfully' };
  }

  /**
   * Generate password reset request for WhatsApp
   */
  generatePasswordReset(userId: string): { success: boolean; message: string; resetCode?: string } {
    const userData = this.initializeUser(userId);
    
    if (!userData.hasSetCustomPassword) {
      return { 
        success: false, 
        message: 'No custom password set. Use liberal login "1234koihai" for first-time access.' 
      };
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store reset code temporarily (expires in 15 minutes)
    userData.resetCode = resetCode;
    userData.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    userData.updatedAt = new Date();
    this.passwords.set(userId, userData);

    console.log(`🔄 Password reset code generated for user ${userId}: ${resetCode}`);
    return { 
      success: true, 
      message: 'Password reset code sent to your WhatsApp', 
      resetCode 
    };
  }

  /**
   * Verify reset code and allow password change
   */
  verifyResetCode(userId: string, resetCode: string): { success: boolean; message: string } {
    const userData = this.passwords.get(userId);
    
    if (!userData || !userData.resetCode || !userData.resetCodeExpiry) {
      return { success: false, message: 'No active password reset request found' };
    }

    if (new Date() > userData.resetCodeExpiry) {
      // Clean up expired reset code
      delete userData.resetCode;
      delete userData.resetCodeExpiry;
      this.passwords.set(userId, userData);
      return { success: false, message: 'Reset code has expired. Please request a new one.' };
    }

    if (userData.resetCode !== resetCode) {
      return { success: false, message: 'Invalid reset code' };
    }

    // Reset code is valid - clean it up
    delete userData.resetCode;
    delete userData.resetCodeExpiry;
    this.passwords.set(userId, userData);

    return { success: true, message: 'Reset code verified successfully' };
  }

  /**
   * Reset password with verified reset code
   */
  resetPasswordWithCode(userId: string, resetCode: string, newPassword: string): { success: boolean; message: string } {
    // First verify the reset code
    const verification = this.verifyResetCode(userId, resetCode);
    if (!verification.success) {
      return verification;
    }

    // Now set the new password
    return this.setCustomPassword(userId, newPassword);
  }

  /**
   * Get all users with password data (admin function)
   */
  getAllUsers(): UserPasswordData[] {
    return Array.from(this.passwords.values());
  }

  /**
   * Export data for persistence (optional)
   */
  exportData(): UserPasswordData[] {
    return this.getAllUsers();
  }

  /**
   * Import data from persistence (optional)
   */
  importData(data: UserPasswordData[]): void {
    this.passwords.clear();
    data.forEach(userData => {
      this.passwords.set(userData.userId, userData);
    });
  }
}

// Singleton instance
export const passwordManager = new PasswordManager();

// Initialize with some test data
console.log('🔐 Password Manager initialized');
export default passwordManager;