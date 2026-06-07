import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import type { AppContext } from '../types/env';
import { authGuard } from '../middleware/auth-guard';
import { mapSharedLinkRow } from '../types';
import { generateId } from '../lib/id';

export const sharedRouter = new Hono<AppContext>({ strict: false });

// ─── Management Endpoints (Require Auth) ───

sharedRouter.post('/', authGuard, async (c) => {
  const userId = c.get('userId');
  const { targetType, targetId, password, expiresAt } = await c.req.json();
  const db = c.env.DB;
  
  const id = generateId().slice(0, 8); // Short slug
  let passwordHash = null;
  
  if (password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  await db.prepare(
    'INSERT INTO shared_links (id, user_id, target_type, target_id, password_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  .bind(id, userId, targetType, targetId, passwordHash, expiresAt || null)
  .run();

  return c.json({ id, url: `${new URL(c.req.url).origin}/shared/${id}` });
});

sharedRouter.get('/', authGuard, async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const { results } = await db.prepare('SELECT * FROM shared_links WHERE user_id = ?').bind(userId).all();
  return c.json({ links: results.map(mapSharedLinkRow) });
});

sharedRouter.delete('/:id', authGuard, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  
  await c.env.DB.prepare('DELETE FROM shared_links WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return c.json({ success: true });
});
