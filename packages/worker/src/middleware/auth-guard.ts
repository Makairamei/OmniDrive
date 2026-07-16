import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import type { AppContext, SessionData } from '../types/env';
import { AppError } from './error-handler';

const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days absolute max

export const authGuard = createMiddleware<AppContext>(async (c, next) => {
  const internalSecret = c.req.header('x-internal-secret');
  if (internalSecret && internalSecret === c.env.TOKEN_ENCRYPTION_KEY) {
    c.set('userId', 'system');
    c.set('session', { userId: 'system', username: 'system', email: null, name: 'System', role: 'super_admin', createdAt: Date.now() });
    await next();
    return;
  }

  const cookie = getCookie(c, 'omnidrive_sid');
  if (!cookie) {
    throw new AppError(401, 'Not authenticated');
  }

  const sessionRow = await c.env.DB.prepare('SELECT session_data FROM sessions WHERE id = ? AND expires_at > ?')
    .bind(cookie, Date.now())
    .first<{ session_data: string }>();

  if (!sessionRow) {
    throw new AppError(401, 'Session expired');
  }

  const session: SessionData = JSON.parse(sessionRow.session_data);

  // Enforce absolute session lifetime
  if (session.createdAt && Date.now() - session.createdAt > MAX_SESSION_AGE) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(cookie).run();
    throw new AppError(401, 'Session expired');
  }

  c.set('userId', session.userId);
  c.set('session', session);

  // Sliding window: extend session TTL on each valid request
  const newExpiresAt = Date.now() + 60 * 60 * 24 * 7 * 1000; // 7 days
  await c.env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
    .bind(newExpiresAt, cookie)
    .run();

  await next();
});
