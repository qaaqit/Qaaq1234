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