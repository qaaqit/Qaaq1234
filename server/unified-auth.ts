import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { User } from '@shared/schema';
import { getJWTSecret } from './secret-validation';

// Lazy load JWT_SECRET only when needed
const getJWT = () => getJWTSecret();

// Enhanced request interface with unified auth data
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        method: 'jwt' | 'replit' | 'whatsapp' | 'google';
        user: User;
        isAuthenticated: boolean;
      };
      userId?: string; // Backward compatibility
    }
  }
}

/**
 * Unified Authentication Middleware
 * Handles ALL authentication methods: JWT, Replit Auth, WhatsApp, Google
 * Automatically resolves users across all identity providers
 */
export const unifiedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔐 Unified Auth: Starting authentication check');
    
    let authResult: { userId: string, method: string, user: User } | null = null;

    // Strategy 1: Check JWT Token (explicit authentication)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('🔑 Unified Auth: Checking JWT token');
      
      try {
        const decoded = jwt.verify(token, getJWT()) as { userId: string };
        const user = await storage.findUserByAnyIdentity(decoded.userId);
        
        if (user) {
          authResult = { userId: user.id, method: 'jwt', user };
          console.log(`✅ Unified Auth: JWT authenticated - ${user.fullName} (${user.id})`);
        } else {
          console.log('❌ Unified Auth: Valid JWT but user not found');
        }
      } catch (error) {
        console.log('❌ Unified Auth: JWT verification failed:', error.message);
      }
    }

    // Strategy 2: Check Replit Session (implicit authentication)
    if (!authResult && req.isAuthenticated?.()) {
      const replitUserId = req.user?.claims?.sub;
      const replitEmail = req.user?.claims?.email;
      
      console.log(`🔑 Unified Auth: Checking Replit session - ID: ${replitUserId}, Email: ${replitEmail}`);
      
      if (replitUserId) {
        // Try to find existing user by Replit ID
        let user = await storage.getUserByReplitId(replitUserId);
        
        // If not found, try by email
        if (!user && replitEmail) {
          user = await storage.findUserByAnyIdentity(replitEmail);
          
          // Link Replit identity to existing user
          if (user) {
            console.log(`🔗 Unified Auth: Linking Replit identity to existing user: ${user.fullName}`);
            await storage.linkIdentityToUser(user.id, {
              provider: 'replit',
              providerId: replitUserId,
              isVerified: true,
              metadata: {
                email: replitEmail,
                displayName: req.user?.claims?.name
              }
            });
          }
        }
        
        // Create new user if not found
        if (!user && replitEmail) {
          console.log('🆕 Unified Auth: Creating new Replit user');
          user = await storage.createReplitUser({
            id: replitUserId,
            sub: replitUserId,
            email: replitEmail,
            name: req.user?.claims?.name,
            profileImageUrl: req.user?.claims?.profile_image_url
          });
        }
        
        if (user) {
          authResult = { userId: user.id, method: 'replit', user };
          console.log(`✅ Unified Auth: Replit authenticated - ${user.fullName} (${user.id})`);
        }
      }
    }

    // Strategy 3: Check for WhatsApp/Phone number in query params (for WhatsApp bot)
    if (!authResult) {
      const phoneNumber = req.query.phone || req.body?.whatsappNumber || req.headers['x-whatsapp-number'];
      
      if (phoneNumber && typeof phoneNumber === 'string') {
        console.log(`🔑 Unified Auth: Checking WhatsApp number: ${phoneNumber}`);
        
        let user = await storage.getUserByWhatsApp(phoneNumber);
        
        // Create WhatsApp user if not found
        if (!user) {
          const displayName = req.body?.displayName || req.headers['x-whatsapp-name'] as string;
          console.log('🆕 Unified Auth: Creating new WhatsApp user');
          user = await storage.createWhatsAppUser(phoneNumber, displayName);
        }
        
        if (user) {
          authResult = { userId: user.id, method: 'whatsapp', user };
          console.log(`✅ Unified Auth: WhatsApp authenticated - ${user.fullName} (${user.id})`);
        }
      }
    }

    if (!authResult) {
      console.log('❌ Unified Auth: No valid authentication found');
      return res.status(401).json({ 
        message: 'Authentication required',
        supportedMethods: ['JWT Bearer token', 'Replit session', 'WhatsApp number'],
        hint: 'Provide Authorization header with Bearer token, login via Replit, or include phone number for WhatsApp'
      });
    }

    // Attach unified auth info to request
    req.auth = {
      ...authResult,
      isAuthenticated: true
    };
    req.userId = authResult.userId; // Backward compatibility
    req.user = authResult.user;

    console.log(`✅ Unified Auth: Success - User: ${authResult.user.fullName}, Method: ${authResult.method}`);
    next();
  } catch (error) {
    console.error('❌ Unified Auth: Error during authentication:', error);
    res.status(500).json({ 
      message: 'Authentication error',
      error: error.message 
    });
  }
};

/**
 * Optional Authentication Middleware
 * Same as unifiedAuth but doesn't fail if no auth is provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Run unified auth but catch 401 errors
    await unifiedAuth(req, res, (error) => {
      if (error) {
        next(error);
      } else {
        next();
      }
    });
  } catch (error) {
    // If auth fails, continue without auth
    console.log('🔓 Optional Auth: No authentication provided, continuing...');
    next();
  }
};

/**
 * Admin-only Authentication Middleware
 * Requires authentication AND admin privileges
 */
export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  await unifiedAuth(req, res, (error) => {
    if (error) {
      return next(error);
    }
    
    if (!req.auth?.user?.isAdmin) {
      console.log(`❌ Admin Auth: User ${req.auth?.user?.fullName} is not an admin`);
      return res.status(403).json({ 
        message: 'Admin privileges required',
        currentUser: req.auth?.user?.fullName 
      });
    }
    
    console.log(`✅ Admin Auth: Admin user ${req.auth.user.fullName} authenticated`);
    next();
  });
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, getJWT(), { expiresIn: '30d' });
};

/**
 * Enhanced authentication endpoint for getting current user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.auth?.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get user identities for complete profile
    const identities = await storage.getUserIdentities(req.auth.user.id);
    
    res.json({
      ...req.auth.user,
      identities,
      authMethod: req.auth.method,
      hasMultipleIdentities: identities.length > 1
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
};

/**
 * Link additional identity to current user
 */
export const linkIdentity = async (req: Request, res: Response) => {
  try {
    if (!req.auth?.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { provider, providerId, metadata } = req.body;
    
    if (!provider || !providerId) {
      return res.status(400).json({ message: 'Provider and providerId required' });
    }

    // Check if identity is already linked to another user
    const existingUser = await storage.getUserByProviderId(provider, providerId);
    if (existingUser && existingUser.id !== req.auth.user.id) {
      return res.status(409).json({ 
        message: 'Identity already linked to another account',
        conflictUser: existingUser.fullName 
      });
    }

    // Link identity
    const identity = await storage.linkIdentityToUser(req.auth.user.id, {
      provider,
      providerId,
      isVerified: false,
      metadata: metadata || {}
    });

    res.json({
      message: 'Identity linked successfully',
      identity,
      user: req.auth.user
    });
  } catch (error) {
    console.error('Error linking identity:', error);
    res.status(500).json({ message: 'Failed to link identity' });
  }
};