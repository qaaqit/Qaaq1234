import { pool } from './db';
import { storage } from './storage';
import { identityConsolidation } from './identity-consolidation';

interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

interface AppleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

// Apple OAuth configuration
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;

// Use custom domain for Apple OAuth callback
const getRedirectUri = () => {
  return 'https://qaaq.app/api/auth/apple/callback';
};

interface AppleAuthSetupOptions {
  clientId?: string;
  clientSecret?: string;
  teamId?: string;
  keyId?: string;
}

export function setupAppleAuth(app: any, options?: AppleAuthSetupOptions) {
  console.log('🍎 Setting up Apple OAuth...');

  // Route for initiating Apple OAuth
  app.get('/api/auth/apple', (req: any, res: any) => {
    try {
      const appleAuthUrl = getAppleAuthUrl();
      console.log('🔗 Redirecting to Apple OAuth:', appleAuthUrl);
      res.redirect(appleAuthUrl);
    } catch (error) {
      console.error('🚨 Apple OAuth initiation failed:', error);
      res.redirect('/login?error=apple_config_error');
    }
  });

  // Route for handling Apple server-to-server notifications
  app.post('/path/to/endpoint', async (req: any, res: any) => {
    try {
      const { events } = req.body;
      console.log('🍎 Apple server-to-server notification received:', events);
      
      if (events && Array.isArray(events)) {
        for (const event of events) {
          const { type, sub, event_time } = event;
          console.log(`🍎 Processing Apple event: ${type} for user ${sub} at ${event_time}`);
          
          // Handle different event types
          switch (type) {
            case 'email-disabled':
              console.log('🍎 User disabled email forwarding:', sub);
              // Update user's email preference in database if needed
              break;
            case 'email-enabled':
              console.log('🍎 User enabled email forwarding:', sub);
              break;
            case 'consent-withdrawn':
              console.log('🍎 User withdrew consent:', sub);
              // Handle account deletion/deactivation
              break;
            case 'account-delete':
              console.log('🍎 User deleted Apple account:', sub);
              // Handle permanent account deletion
              break;
            default:
              console.log('🍎 Unknown Apple event type:', type);
          }
        }
      }
      
      // Apple expects a 200 response to acknowledge receipt
      res.status(200).send('OK');
    } catch (error) {
      console.error('🚨 Apple notification handling error:', error);
      res.status(500).send('Error processing notification');
    }
  });

  // Route for handling Apple OAuth callback
  app.get('/api/auth/apple/callback', async (req: any, res: any) => {
    const { code, state, error } = req.query;

    console.log('🍎 Apple OAuth callback received:', { code: !!code, state, error });

    if (error) {
      console.error('🚨 Apple OAuth error:', error);
      return res.redirect('/login?error=apple_auth_failed');
    }

    if (!code) {
      console.error('🚨 Apple OAuth: No authorization code received');
      return res.redirect('/login?error=apple_no_code');
    }

    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForToken(code);
      console.log('✅ Apple OAuth: Tokens obtained');

      // Decode the ID token to get user info
      const userInfo = await getAppleUserInfo(tokens.id_token || '');
      console.log('✅ Apple OAuth: User info obtained:', userInfo.sub);

      // Find or create user in our system
      const user = await findOrCreateAppleUser(userInfo);
      console.log('✅ Apple OAuth: User processed:', user.fullName);

      // Set up session
      req.session.passport = { user };
      
      console.log('✅ Apple OAuth: Login successful, redirecting to /qbot');
      res.redirect('/qbot');
    } catch (error) {
      console.error('🚨 Apple OAuth callback error:', error);
      res.redirect('/login?error=apple_auth_failed');
    }
  });

  console.log('✅ Apple OAuth routes configured');
}

export function getAppleAuthUrl(): string {
  if (!APPLE_CLIENT_ID) {
    throw new Error('APPLE_CLIENT_ID environment variable is required');
  }

  const currentRedirectUri = getRedirectUri();
  const scope = encodeURIComponent('email name');
  const redirectUri = encodeURIComponent(currentRedirectUri);
  const state = Math.random().toString(36).substring(2);
  
  console.log(`🔗 Apple OAuth redirect URI: ${currentRedirectUri}`);
  console.log(`🔗 Make sure this EXACT URL is in Apple Developer Console: ${currentRedirectUri}`);
  
  return `https://appleid.apple.com/auth/authorize?` +
    `client_id=${APPLE_CLIENT_ID}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `response_mode=form_post&` +
    `state=${state}`;
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string): Promise<AppleTokenResponse> {
  if (!APPLE_CLIENT_ID || !APPLE_CLIENT_SECRET) {
    throw new Error('Apple OAuth environment variables not configured');
  }

  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: APPLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

async function getAppleUserInfo(idToken: string): Promise<AppleUserInfo> {
  if (!idToken) {
    throw new Error('No ID token provided');
  }

  try {
    // Decode JWT ID token (Apple returns user info in the ID token)
    const base64Payload = idToken.split('.')[1];
    const payload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    const userInfo = JSON.parse(payload);
    
    console.log('🍎 Apple user info from ID token:', userInfo);
    return userInfo;
  } catch (error) {
    throw new Error(`Failed to decode Apple ID token: ${error}`);
  }
}

async function findOrCreateAppleUser(appleUser: AppleUserInfo): Promise<any> {
  try {
    console.log('🔍 APPLE AUTH: Processing Apple user with ID:', appleUser.sub);
    
    // Use identity consolidation service for Apple auth
    const result = await identityConsolidation.consolidateOnLogin(
      appleUser.sub, 
      'apple', 
      {
        email: appleUser.email || '',
        name: appleUser.name ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim() : '',
        displayName: appleUser.name ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim() : '',
        profileImageUrl: null, // Apple doesn't provide profile pictures
        firstName: appleUser.name?.firstName,
        lastName: appleUser.name?.lastName
      }
    );
    
    console.log('✅ APPLE AUTH: User processed via consolidation:', result.fullName);
    return result;
  } catch (error) {
    console.error('🚨 APPLE AUTH: Consolidation failed, using fallback:', error);
    
    // Fallback to legacy method if consolidation fails
    try {
      // First try to find user by Apple ID (stored in googleId field for compatibility)
      let user = await storage.getUserByGoogleId(appleUser.sub);
      
      if (user) {
        // Update last login time for existing Apple user
        await pool.query(`
          UPDATE users SET last_login = NOW() WHERE google_id = $1
        `, [appleUser.sub]);
        console.log('✅ APPLE AUTH: Found existing Apple user:', user.fullName);
        return user;
      }

      // Try to find user by email if email is provided
      if (appleUser.email) {
        user = await storage.getUserByEmail(appleUser.email);
        
        if (user) {
          // Link existing account to Apple
          await pool.query(`
            UPDATE users SET 
              google_id = $1,
              google_email = $2,
              auth_provider = 'apple',
              last_login = NOW()
            WHERE id = $3
          `, [appleUser.sub, appleUser.email, user.id]);
          console.log('✅ APPLE AUTH: Linked existing user to Apple:', user.fullName);
          return user;
        }
      }

      // Create new user
      const fullName = appleUser.name 
        ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
        : appleUser.email || 'Apple User';

      const newUser = await storage.createGoogleUser({
        googleId: appleUser.sub,
        fullName: fullName,
        email: appleUser.email || '',
        googleEmail: appleUser.email || '',
        googleProfilePictureUrl: null,
        googleDisplayName: fullName,
        authProvider: 'apple',
        userType: 'sailor', // Default to sailor, can be changed later
        isVerified: true, // Apple accounts are pre-verified
      });

      console.log('✅ APPLE AUTH: Created new Apple user:', newUser.fullName);
      return newUser;
    } catch (fallbackError) {
      console.error('🚨 APPLE AUTH: Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
}