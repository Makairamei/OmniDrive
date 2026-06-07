# Automation Rules Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automation engine to evaluate event-based and cron-based rules to auto-move/delete files.

**Architecture:** Cloudflare Workers `ctx.waitUntil()` for background processing, D1 SQLite for rules storage, React/Vite for frontend configuration.

**Tech Stack:** Hono, Cloudflare Workers, Vitest, React, Zustand

---

### Task 1: Database Schema & Types

**Files:**
- Modify: `packages/worker/src/db/schema.sql`
- Create: `packages/worker/src/types/automation.ts`

- [ ] **Step 1: Write SQL Schema updates**
Append to `packages/worker/src/db/schema.sql`:

```sql
-- Automation Rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    trigger_type    TEXT NOT NULL,
    trigger_config  TEXT,
    conditions      TEXT,
    actions         TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type, is_active);

-- Automation Logs
CREATE TABLE IF NOT EXISTS automation_logs (
    id              TEXT PRIMARY KEY,
    rule_id         TEXT NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    status          TEXT NOT NULL,
    details         TEXT,
    executed_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON automation_logs(rule_id);
```

- [ ] **Step 2: Define Types**
Create `packages/worker/src/types/automation.ts`:

```typescript
export interface RuleCondition {
  field: 'name' | 'extension';
  operator: 'endswith' | 'contains' | 'equals';
  value: string;
}

export interface RuleAction {
  type: 'move' | 'delete';
  target_folder_id?: string;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  trigger_type: 'event' | 'cron';
  trigger_config: any;
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/worker/src/db/schema.sql packages/worker/src/types/automation.ts
git commit -m "feat(db): add automation schema and types"
```

### Task 2: Automation Condition Evaluator

**Files:**
- Create: `packages/worker/src/services/automation.service.ts`
- Create: `packages/worker/tests/automation.test.ts`

- [ ] **Step 1: Write the failing test**
Create `packages/worker/tests/automation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../src/services/automation.service';
import type { RuleCondition } from '../src/types/automation';

describe('Automation Evaluator', () => {
  it('should match endswith for file name', () => {
    const file = { name: 'invoice.pdf' };
    const condition: RuleCondition = { field: 'name', operator: 'endswith', value: '.pdf' };
    expect(evaluateCondition(file, [condition])).toBe(true);
  });

  it('should fail if condition does not match', () => {
    const file = { name: 'photo.jpg' };
    const condition: RuleCondition = { field: 'name', operator: 'endswith', value: '.pdf' };
    expect(evaluateCondition(file, [condition])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -w packages/worker -- automation.test.ts
```
Expected: FAIL with "evaluateCondition not defined"

- [ ] **Step 3: Write minimal implementation**
Create `packages/worker/src/services/automation.service.ts`:

```typescript
import type { RuleCondition } from '../src/types/automation';

export function evaluateCondition(file: any, conditions: RuleCondition[]): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  return conditions.every(cond => {
    const value = file[cond.field]?.toLowerCase() || '';
    const target = cond.value.toLowerCase();
    
    switch (cond.operator) {
      case 'endswith': return value.endsWith(target);
      case 'contains': return value.includes(target);
      case 'equals': return value === target;
      default: return false;
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -w packages/worker -- automation.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/src/services/automation.service.ts packages/worker/tests/automation.test.ts
git commit -m "feat(worker): implement automation condition evaluator"
```

### Task 3: Automation Actions Execution Engine

**Files:**
- Modify: `packages/worker/src/services/automation.service.ts`

- [ ] **Step 1: Implement Engine logic**
Append to `packages/worker/src/services/automation.service.ts`:

```typescript
import type { Env } from '../types/env';
import type { AutomationRule } from '../types/automation';

export class AutomationEngine {
  constructor(private env: Env) {}

  async processEventTrigger(file: any, ctx: ExecutionContext) {
    const db = this.env.DB;
    const { results } = await db.prepare(
      `SELECT * FROM automation_rules WHERE trigger_type = 'event' AND is_active = 1 AND user_id = ?`
    ).bind(file.user_id).all();

    for (const row of results) {
      const conditions = JSON.parse(row.conditions as string || '[]');
      if (evaluateCondition(file, conditions)) {
        const actions = JSON.parse(row.actions as string || '[]');
        ctx.waitUntil(this.executeActions(row.id as string, file, actions));
      }
    }
  }

  async processCronTrigger(ctx: ExecutionContext) {
    const db = this.env.DB;
    const { results } = await db.prepare(`SELECT * FROM automation_rules WHERE trigger_type = 'cron' AND is_active = 1`).all();
    
    // Simplification for the plan: runs all active cron rules
    for (const row of results) {
      const conditions = JSON.parse(row.conditions as string || '[]');
      const actions = JSON.parse(row.actions as string || '[]');
      
      // Get all files for user
      const { results: files } = await db.prepare(`SELECT * FROM files WHERE user_id = ? AND is_trashed = 0`).bind(row.user_id).all();
      for (const file of files) {
        if (evaluateCondition(file, conditions)) {
          ctx.waitUntil(this.executeActions(row.id as string, file, actions));
        }
      }
    }
  }

  private async executeActions(ruleId: string, file: any, actions: any[]) {
    try {
      for (const action of actions) {
        if (action.type === 'move' && action.target_folder_id) {
          await this.env.DB.prepare('UPDATE files SET virtual_folder_id = ?, updated_at = datetime("now") WHERE id = ?')
            .bind(action.target_folder_id, file.id).run();
        } else if (action.type === 'delete') {
          await this.env.DB.prepare('UPDATE files SET is_trashed = 1 WHERE id = ?')
            .bind(file.id).run();
        }
      }
      
      await this.env.DB.prepare('INSERT INTO automation_logs (id, rule_id, status, details) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), ruleId, 'success', JSON.stringify({ fileId: file.id })).run();
    } catch (error: any) {
      await this.env.DB.prepare('INSERT INTO automation_logs (id, rule_id, status, details) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), ruleId, 'error', error.message).run();
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/services/automation.service.ts
git commit -m "feat(worker): add automation execution engine"
```

### Task 4: Automation API Endpoints

**Files:**
- Create: `packages/worker/src/routes/automations.ts`
- Modify: `packages/worker/src/index.ts`

- [ ] **Step 1: Write API implementation**
Create `packages/worker/src/routes/automations.ts`:

```typescript
import { Hono } from 'hono';
import type { AppContext } from '../types/env';
import { generateId } from '../lib/id';
import { authGuard } from '../middleware/auth-guard';

export const automationsRouter = new Hono<AppContext>({ strict: false });
automationsRouter.use('*', authGuard);

automationsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare('SELECT * FROM automation_rules WHERE user_id = ?').bind(userId).all();
  return c.json({
    rules: results.map((r: any) => ({
      ...r,
      conditions: JSON.parse(r.conditions || '[]'),
      actions: JSON.parse(r.actions || '[]'),
      is_active: Boolean(r.is_active)
    }))
  });
});

automationsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const id = generateId();
  
  await c.env.DB.prepare(`
    INSERT INTO automation_rules (id, user_id, name, trigger_type, trigger_config, conditions, actions) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId, body.name, body.trigger_type, 
    JSON.stringify(body.trigger_config || {}), 
    JSON.stringify(body.conditions || []), 
    JSON.stringify(body.actions || [])
  ).run();
  
  return c.json({ id, success: true }, 201);
});

automationsRouter.patch('/:id/toggle', async (c) => {
  const userId = c.get('userId');
  const ruleId = c.req.param('id');
  const { is_active } = await c.req.json();
  
  await c.env.DB.prepare('UPDATE automation_rules SET is_active = ? WHERE id = ? AND user_id = ?')
    .bind(is_active ? 1 : 0, ruleId, userId).run();
    
  return c.json({ success: true });
});
```

- [ ] **Step 2: Connect router and Cron in index**
Modify `packages/worker/src/index.ts`. Add imports and use:

```typescript
// Replace lines around app.route with:
import { automationsRouter } from './routes/automations';
import { AutomationEngine } from './services/automation.service';

// ... Inside route definitions
app.route('/api/automations', automationsRouter);

// Inside scheduled() block:
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log('Cron triggered:', event.cron);
    ctx.waitUntil(runScheduledSync(env));
    const engine = new AutomationEngine(env);
    ctx.waitUntil(engine.processCronTrigger(ctx));
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 3: Commit**

```bash
git add packages/worker/src/routes/automations.ts packages/worker/src/index.ts
git commit -m "feat(api): add automations API router and cron trigger"
```

### Task 5: Event Trigger Integration

**Files:**
- Modify: `packages/worker/src/routes/files.ts`

- [ ] **Step 1: Dispatch event on upload finalize**
Modify `packages/worker/src/routes/files.ts` in the `POST /upload/finalize` handler:

```typescript
// Add to imports at top:
import { AutomationEngine } from '../services/automation.service';

// Add to bottom of /upload/finalize, right before return c.json:
const engine = new AutomationEngine(c.env);
c.executionCtx.waitUntil(engine.processEventTrigger({ ...created, user_id: userId }, c.executionCtx));
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/routes/files.ts
git commit -m "feat(worker): trigger automations on file upload"
```

### Task 6: Frontend - API Client and Zustand Store

**Files:**
- Create: `packages/web/src/stores/useAutomationStore.ts`

- [ ] **Step 1: Write Automation Store**
Create `packages/web/src/stores/useAutomationStore.ts`:

```typescript
import { create } from 'zustand';

interface Rule {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
}

interface AutomationStore {
  rules: Rule[];
  fetchRules: () => Promise<void>;
  toggleRule: (id: string, is_active: boolean) => Promise<void>;
}

export const useAutomationStore = create<AutomationStore>((set) => ({
  rules: [],
  fetchRules: async () => {
    const res = await fetch('/api/automations', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    set({ rules: data.rules });
  },
  toggleRule: async (id, is_active) => {
    await fetch(`/api/automations/${id}/toggle`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ is_active })
    });
    set((state) => ({
      rules: state.rules.map(r => r.id === id ? { ...r, is_active } : r)
    }));
  }
}));
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/stores/useAutomationStore.ts
git commit -m "feat(web): add automation store"
```

### Task 7: Frontend - Rules List UI

**Files:**
- Create: `packages/web/src/pages/Automations.tsx`

- [ ] **Step 1: Create Automations Page Component**
Create `packages/web/src/pages/Automations.tsx`:

```tsx
import React, { useEffect } from 'react';
import { useAutomationStore } from '../stores/useAutomationStore';
import { Settings, Play, Clock } from 'lucide-react';

export function Automations() {
  const { rules, fetchRules, toggleRule } = useAutomationStore();

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Automations
        </h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          New Rule
        </button>
      </div>

      <div className="grid gap-4">
        {rules.map(rule => (
          <div key={rule.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{rule.name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                {rule.trigger_type === 'event' ? <Play className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {rule.trigger_type === 'event' ? 'On File Change' : 'Scheduled'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={rule.is_active} onChange={(e) => toggleRule(rule.id, e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No automation rules yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/Automations.tsx
git commit -m "feat(web): add automations page UI"
```
