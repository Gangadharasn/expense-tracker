import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { getAppUsers, UserRole } from './users.config';

export interface AuthPayload {
  username: string;
  displayName: string;
  role: UserRole;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly secret =
    process.env.AUTH_SECRET ?? 'expense-tracker-dev-secret-change-in-prod';
  private readonly tokenTtlMs = 7 * 24 * 60 * 60 * 1000;

  login(code: string) {
    const user = getAppUsers().find((u) => u.pin === code);
    if (!user) {
      throw new UnauthorizedException('Invalid access code');
    }

    const payload: AuthPayload = {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      exp: Date.now() + this.tokenTtlMs,
    };

    return {
      token: this.signToken(payload),
      user: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  verifyToken(token: string): AuthPayload {
    const payload = this.parseToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    return payload;
  }

  getUserList() {
    return getAppUsers().map((u) => ({
      username: u.username,
      displayName: u.displayName,
      role: u.role,
    }));
  }

  private signToken(payload: AuthPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
    return `${data}.${sig}`;
  }

  private parseToken(token: string): AuthPayload | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, sig] = parts;
    const expected = createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');

    try {
      const sigBuf = Buffer.from(sig);
      const expectedBuf = Buffer.from(expected);
      if (
        sigBuf.length !== expectedBuf.length ||
        !timingSafeEqual(sigBuf, expectedBuf)
      ) {
        return null;
      }
    } catch {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(data, 'base64url').toString('utf8'),
      ) as AuthPayload;
      if (!payload.exp || payload.exp < Date.now()) return null;
      if (!payload.username || !payload.role) return null;
      return payload;
    } catch {
      return null;
    }
  }
}
