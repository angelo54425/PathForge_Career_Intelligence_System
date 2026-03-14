import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'pathforge-dev-secret';

/**
 * Derive the encryption key that NextAuth v5 uses (HKDF-SHA256).
 */
function getDerivedKey(secret: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.hkdf(
      'sha256',
      secret,
      '',
      'NextAuth.js Generated Encryption Key',
      32,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(Buffer.from(derivedKey));
      }
    );
  });
}

/**
 * Extract user payload from a NextAuth v5 encrypted JWT (JWE).
 * Uses dynamic import for jose (ESM-only package).
 */
async function decryptNextAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const { jwtDecrypt } = await import('jose');
    const key = await getDerivedKey(NEXTAUTH_SECRET);
    const { payload } = await jwtDecrypt(token, new Uint8Array(key), {
      clockTolerance: 15,
    });
    return {
      userId: (payload.sub ?? payload.userId) as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/**
 * Middleware that requires a valid JWT. Returns 401 if missing/invalid.
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.split(' ')[1];
  const payload = await decryptNextAuthToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Middleware that optionally extracts user from JWT but does NOT block the request.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    const payload = await decryptNextAuthToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}
