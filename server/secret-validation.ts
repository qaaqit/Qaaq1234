/**
 * Startup Secret Validation
 * Ensures all required environment variables are present before the app starts
 */

interface RequiredSecret {
  name: string;
  description: string;
  required: boolean;
}

const REQUIRED_SECRETS: RequiredSecret[] = [
  { name: 'JWT_SECRET', description: 'Secret key for JWT token signing', required: true },
  { name: 'SESSION_SECRET', description: 'Secret key for session management', required: true },
  { name: 'DATABASE_URL', description: 'Database connection string', required: true },
  { name: 'GOOGLE_CLIENT_ID', description: 'Google OAuth client ID', required: false },
  { name: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth client secret', required: false },
  { name: 'LINKEDIN_CLIENT_ID', description: 'LinkedIn OAuth client ID', required: false },
  { name: 'LINKEDIN_CLIENT_SECRET', description: 'LinkedIn OAuth client secret', required: false }
];

export class SecretValidator {
  private static instance: SecretValidator;
  private validatedSecrets: Map<string, string> = new Map();

  static getInstance(): SecretValidator {
    if (!SecretValidator.instance) {
      SecretValidator.instance = new SecretValidator();
    }
    return SecretValidator.instance;
  }

  /**
   * Validate all required secrets at startup
   */
  validateStartupSecrets(): void {
    console.log('🔐 Validating required secrets...');
    
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const secret of REQUIRED_SECRETS) {
      const value = process.env[secret.name];
      
      if (!value || value.trim() === '') {
        if (secret.required) {
          missing.push(`${secret.name} (${secret.description})`);
        } else {
          warnings.push(`${secret.name} (${secret.description}) - Optional but recommended`);
        }
      } else {
        this.validatedSecrets.set(secret.name, value);
        console.log(`✅ ${secret.name}: Present`);
      }
    }

    // Log warnings for optional secrets
    if (warnings.length > 0) {
      console.warn('⚠️  Optional secrets missing:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    // Fail fast if required secrets are missing
    if (missing.length > 0) {
      console.error('❌ Required secrets missing:');
      missing.forEach(secret => console.error(`   - ${secret}`));
      console.error('\n🚨 Application cannot start without required secrets.');
      console.error('Please set the missing environment variables and restart.');
      process.exit(1);
    }

    console.log('✅ All required secrets validated successfully');
  }

  /**
   * Get a validated secret - throws error if not validated
   */
  getSecret(name: string): string {
    const value = this.validatedSecrets.get(name);
    if (!value) {
      throw new Error(`Secret ${name} not found or not validated. Ensure validateStartupSecrets() was called.`);
    }
    return value;
  }

  /**
   * Check if a secret exists (for optional secrets)
   */
  hasSecret(name: string): boolean {
    return this.validatedSecrets.has(name);
  }
}

// Export singleton instance
export const secretValidator = SecretValidator.getInstance();

// Export convenient getters
export const getJWTSecret = (): string => secretValidator.getSecret('JWT_SECRET');
export const getSessionSecret = (): string => secretValidator.getSecret('SESSION_SECRET');
export const getDatabaseURL = (): string => secretValidator.getSecret('DATABASE_URL');