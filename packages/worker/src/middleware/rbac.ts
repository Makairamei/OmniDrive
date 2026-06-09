export async function getWorkspaceRole(db: D1Database, workspaceId: string, userId: string): Promise<string | null> {
  const member = await db.prepare(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).bind(workspaceId, userId).first<{ role: string }>();
  return member ? member.role : null;
}

export function hasPermission(role: string, requiredRole: 'viewer' | 'commenter' | 'editor' | 'manager' | 'auditor' | 'owner'): boolean {
  const levels: Record<string, number> = {
    'viewer': 1,
    'auditor': 1,
    'commenter': 2,
    'editor': 3,
    'manager': 4,
    'owner': 5
  };
  return (levels[role] || 0) >= levels[requiredRole];
}
