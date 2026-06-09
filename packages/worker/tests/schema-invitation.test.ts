import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('Schema - Invitations & Admin', () => {
  beforeAll(async () => {
    // Read actual schema.sql to avoid schema drift
    const schemaPath = join(__dirname, '../src/db/schema.sql');
    const schemaSql = await readFile(schemaPath, 'utf-8');
    
    // Execute the actual schema
    await env.DB.exec(schemaSql);
  });

  it('can insert super admin and invitation code', async () => {
    await env.DB.prepare('INSERT INTO users (id, username, password_hash, is_super_admin) VALUES (?, ?, ?, ?)').bind('u1', 'admin', 'hash', 1).run();
    await env.DB.prepare('INSERT INTO invitation_codes (id, code, created_by) VALUES (?, ?, ?)').bind('c1', 'TEAM-26', 'u1').run();
    
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind('u1').first<any>();
    expect(user.is_super_admin).toBe(1);

    const code = await env.DB.prepare('SELECT * FROM invitation_codes WHERE code = ?').bind('TEAM-26').first<any>();
    expect(code.created_by).toBe('u1');
    expect(code.used_count).toBe(0);
  });

  it('enforces UNIQUE constraint on invitation code', async () => {
    await env.DB.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').bind('u2', 'admin2', 'hash').run();
    await env.DB.prepare('INSERT INTO invitation_codes (id, code, created_by) VALUES (?, ?, ?)').bind('c2', 'TEAM-DUP', 'u2').run();
    
    await expect(
      env.DB.prepare('INSERT INTO invitation_codes (id, code, created_by) VALUES (?, ?, ?)').bind('c3', 'TEAM-DUP', 'u2').run()
    ).rejects.toThrow();
  });

  it('enforces ON DELETE CASCADE for created_by', async () => {
    await env.DB.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').bind('u3', 'admin3', 'hash').run();
    await env.DB.prepare('INSERT INTO invitation_codes (id, code, created_by) VALUES (?, ?, ?)').bind('c4', 'TEAM-DEL', 'u3').run();
    
    let count = await env.DB.prepare('SELECT count(*) as c FROM invitation_codes WHERE id = ?').bind('c4').first<{ c: number }>();
    expect(count?.c).toBe(1);

    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind('u3').run();

    count = await env.DB.prepare('SELECT count(*) as c FROM invitation_codes WHERE id = ?').bind('c4').first<{ c: number }>();
    expect(count?.c).toBe(0);
  });
});
