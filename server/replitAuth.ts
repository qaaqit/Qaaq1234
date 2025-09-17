import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { identityConsolidation } from "./identity-consolidation";
import { identityResolver } from "./identity-resolver";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  const connectionString = process.env.QAAQ_DATABASE_URL || process.env.DATABASE_URL;
  console.log('🗄️ Session store: Creating with database connection to:', connectionString?.replace(/postgresql:\/\/[^@]+@/, 'postgresql://****@'));
  
  const sessionStore = new pgStore({
    conString: connectionString,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
    pruneSessionInterval: 60 * 15 // 15 minutes
  });
  
  // Test the connection immediately
  try {
    console.log('🔍 Session store: Testing database connection...');
  } catch (error) {
    console.error('❌ Session store: Failed to initialize:', error);
  }
  
  sessionStore.on('connect', () => {
    console.log('✅ Session store: Connected to database successfully');
  });
  
  sessionStore.on('disconnect', () => {
    console.log('❌ Session store: Disconnected from database');
  });
  
  sessionStore.on('error', (error) => {
    console.error('❌ Session store error:', error);
  });
  
  console.log('🍪 Session config: secure =', process.env.NODE_ENV === 'production');
  
  return session({
    name: 'replit.sid',
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // Changed to true to ensure session is created
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: false, // Force false for development
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  console.log('🔍 REPLIT AUTH: Processing user with claims:', claims);
  console.log('🔍 REPLIT AUTH: Email:', claims["email"], 'Sub:', claims["sub"]);
  
  try {
    // First, check if user already exists by email (Google Auth, etc.)
    const existingUser = await storage.getUserByEmail(claims["email"]);
    
    if (existingUser) {
      console.log(`🔗 REPLIT AUTH: Found existing user by email:`, existingUser.fullName, `(ID: ${existingUser.id})`);
      
      // Link Replit identity to existing user and return the existing user
      try {
        await storage.linkIdentityToUser(existingUser.id, {
          provider: 'replit',
          providerId: claims["sub"],
          isVerified: true,
          metadata: {
            consolidatedAt: [new Date().toISOString()],
            replitClaims: claims
          }
        });
        console.log(`✅ REPLIT AUTH: Linked Replit identity to existing user ${existingUser.id}`);
      } catch (linkError: any) {
        console.log(`ℹ️ REPLIT AUTH: Identity already linked or table missing:`, linkError.message);
      }
      
      // Update user with any new Replit data
      const updatedData = {
        authProvider: 'replit', // Update primary auth provider
        googleProfilePictureUrl: claims["profile_image_url"] || existingUser.profilePictureUrl
      };
      
      const updatedUser = await storage.updateUser(existingUser.id, updatedData);
      console.log(`✅ REPLIT AUTH: Using existing user (consolidated):`, updatedUser?.fullName || existingUser.fullName);
      return updatedUser || existingUser;
    }
    
    // If no existing user, use identity consolidation service
    const result = await identityConsolidation.consolidateOnLogin(
      claims["sub"], 
      'replit', 
      {
        email: claims["email"],
        name: `${claims["first_name"]} ${claims["last_name"]}`.trim(),
        displayName: claims["name"],
        profileImageUrl: claims["profile_image_url"],
        firstName: claims["first_name"],
        lastName: claims["last_name"]
      }
    );
    
    console.log('✅ REPLIT AUTH: New user created via consolidation:', result.fullName);
    return result;
  } catch (error) {
    console.error('🚨 REPLIT AUTH ERROR:', error);
    // Fallback to legacy method
    const result = await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    console.log('✅ REPLIT AUTH: Fallback user upserted:', result.fullName);
    return result;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log('✅ Replit Auth: Token verification started');
      const user: any = {
        id: tokens.claims()?.sub
      };
      updateUserSession(user, tokens);
      console.log('✅ Replit Auth: User session updated');
      
      const dbUser = await upsertUser(tokens.claims());
      console.log('✅ Replit Auth: User upserted to database:', dbUser.fullName);
      
      // Store user info for session persistence
      user.dbUser = dbUser;
      user.userId = dbUser.id;
      
      verified(null, user);
      console.log('✅ Replit Auth: Verification completed successfully for user:', user.userId);
    } catch (error) {
      console.error('❌ Replit Auth: Verification failed:', error);
      verified(error as Error);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: any, cb) => {
    console.log('🔄 Serializing user for session:', user?.userId || user?.id);
    cb(null, {
      id: user.id,
      userId: user.userId,
      claims: user.claims,
      access_token: user.access_token,
      refresh_token: user.refresh_token,
      expires_at: user.expires_at,
      dbUser: user.dbUser
    });
  });
  
  passport.deserializeUser((sessionData: any, cb) => {
    console.log('🔄 Deserializing user from session:', sessionData?.userId || sessionData?.id);
    console.log('🔄 Full session data structure:', {
      hasUserId: !!sessionData?.userId,
      hasId: !!sessionData?.id,
      hasClaims: !!sessionData?.claims,
      hasDbUser: !!sessionData?.dbUser,
      claimsKeys: sessionData?.claims ? Object.keys(sessionData.claims) : [],
      topLevelKeys: sessionData ? Object.keys(sessionData) : []
    });
    cb(null, sessionData);
  });

  app.get("/api/login", (req, res, next) => {
    console.log('🔐 Replit Auth: Login initiated for hostname:', req.hostname);
    
    // Store return URL in session if provided
    const returnUrl = req.query.returnUrl as string;
    if (returnUrl && req.session) {
      (req.session as any).returnUrl = returnUrl;
      console.log('🔄 Replit Auth: Stored return URL in session:', returnUrl);
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('🔄 Replit Auth: Callback received for hostname:', req.hostname);
    console.log('🔄 Replit Auth: Callback query params:', req.query);
    
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
      if (err) {
        console.error('❌ Replit Auth: Authentication error:', err);
        return res.redirect('/login?error=auth_failed');
      }
      
      if (!user) {
        console.error('❌ Replit Auth: No user returned:', info);
        return res.redirect('/login?error=no_user');
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('❌ Replit Auth: Login error:', loginErr);
          return res.redirect('/login?error=login_failed');
        }
        
        // Check for return URL stored in session or default to QBOT Chat
        const returnUrl = (req.session as any)?.returnUrl || '/qbot';
        if ((req.session as any)?.returnUrl) {
          delete (req.session as any).returnUrl; // Clean up after use
        }
        console.log('✅ Replit Auth: Login successful, redirecting to:', returnUrl);
        res.redirect(returnUrl);
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};