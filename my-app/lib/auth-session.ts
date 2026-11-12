
import { createHmac, timingSafeEqual } from 'node:crypto';

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('AUTH_SECRET is missing from environment variables.');
  }

  return secret;
}

interface SessionPayload {
  userId: string;
  schoolId: string;
  expiresAt: number;
}

export function createSessionToken(userId: string, schoolId: string) {
  const payload: SessionPayload = {
    userId,
    schoolId,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  };

  const encodedPayload = Buffer
    .from(JSON.stringify(payload))
    .toString('base64url');

  const signature = createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [encodedPayload, suppliedSignature] = token.split('.');

    if (!encodedPayload || !suppliedSignature) {
      return null;
    }

    const expectedSignature = createHmac('sha256', getAuthSecret())
      .update(encodedPayload)
      .digest();

    const actualSignature = Buffer.from(
      suppliedSignature,
      'base64url'
    );

    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as SessionPayload;

    if (
      !payload.userId ||
      !payload.schoolId ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
