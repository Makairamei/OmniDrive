# Factory Reset Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a secure, automated `make` command to factory reset D1 Database and KV Namespace data.

**Architecture:** A Node.js ESM script (`reset.mjs`) that safely prompts for confirmation on remote resets and orchestrates `wrangler` CLI commands via `child_process.execSync` to wipe and rebuild the database and namespace. We will use Vitest to write unit tests mocking the filesystem and process executions.

**Tech Stack:** Node.js, bash/make, Vitest (for tests).

---

### Task 1: Setup Makefile and Package Scripts

**Files:**
- Modify: `packages/worker/package.json`
- Modify: `Makefile`

- [ ] **Step 1: Write the package.json scripts**

Modify `packages/worker/package.json` to add the `db:reset:local` and `db:reset:remote` scripts under the `"scripts"` section.

```json
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run --outdir=dist",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate:local": "wrangler d1 execute omnidrive --local --file=src/db/schema.sql",
    "db:migrate:remote": "wrangler d1 execute omnidrive --remote --file=src/db/schema.sql",
    "db:reset:local": "node scripts/reset.mjs --local",
    "db:reset:remote": "node scripts/reset.mjs --remote"
  },
```

- [ ] **Step 2: Update Makefile targets**

Modify `Makefile` at the root directory to add targets delegating to the `package.json` scripts. Add these to the end of the file.

```makefile
# Reset Data Local
reset-local:
	@echo "=> Starting Local Factory Reset..."
	cd packages/worker && npm run db:reset:local

# Reset Data Remote
reset-remote:
	@echo "=> Starting Remote Factory Reset..."
	cd packages/worker && npm run db:reset:remote
```

- [ ] **Step 3: Update `.PHONY` in Makefile**

Modify the first line of `Makefile` to include the new commands.

```makefile
.PHONY: help deploy-worker deploy-web deploy-all db-migrate-local db-migrate-remote reset-local reset-remote
```

- [ ] **Step 4: Commit**

```bash
git add packages/worker/package.json Makefile
git commit -m "chore: add db reset commands to makefile and package.json"
```

---

### Task 2: Create the Reset Script Structure and Prompt Logic

**Files:**
- Create: `packages/worker/scripts/reset.mjs`
- Create: `packages/worker/tests/reset.test.ts`

- [ ] **Step 1: Write the failing test for the prompt logic**

Create `packages/worker/tests/reset.test.ts` to test the prompt behavior. We will test the core functions independently by separating them from the execution script.

```typescript
import { describe, it, expect } from 'vitest';
import { promptUser } from '../scripts/reset.mjs';

describe('reset.mjs prompt logic', () => {
  it('should return true if not remote', async () => {
    const result = await promptUser(false);
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/worker && npx vitest run tests/reset.test.ts`
Expected: FAIL because `scripts/reset.mjs` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `packages/worker/scripts/reset.mjs`. We'll write the prompt function and export it.

```javascript
import readline from 'readline';

export async function promptUser(isRemote) {
  if (!isRemote) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("\x1b[31mPERINGATAN: Anda akan menghapus SELURUH data di PRODUCTION. Ketik 'YES' untuk melanjutkan: \x1b[0m", (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/worker && npx vitest run tests/reset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/scripts/reset.mjs packages/worker/tests/reset.test.ts
git commit -m "feat(worker): add prompt logic for reset script"
```

---

### Task 3: Implement D1 Wipe & Rebuild Logic

**Files:**
- Modify: `packages/worker/tests/reset.test.ts`
- Modify: `packages/worker/scripts/reset.mjs`

- [ ] **Step 1: Write the failing test for D1 logic**

Modify `packages/worker/tests/reset.test.ts` to add tests for D1 reset logic.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { promptUser, resetD1 } from '../scripts/reset.mjs';

describe('reset.mjs prompt logic', () => {
  it('should return true if not remote', async () => {
    const result = await promptUser(false);
    expect(result).toBe(true);
  });
});

describe('reset.mjs D1 logic', () => {
  it('should execute wrangler d1 commands with correct flag', () => {
    const execSyncMock = vi.fn();
    resetD1(execSyncMock, '--local');
    
    expect(execSyncMock).toHaveBeenCalledTimes(2);
    expect(execSyncMock.mock.calls[0][0]).toContain('d1 execute omnidrive --local --command');
    expect(execSyncMock.mock.calls[0][0]).toContain('delete from sqlite_master');
    expect(execSyncMock.mock.calls[1][0]).toContain('d1 execute omnidrive --local --file=src/db/schema.sql');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/worker && npx vitest run tests/reset.test.ts`
Expected: FAIL because `resetD1` is not exported from `scripts/reset.mjs`.

- [ ] **Step 3: Write minimal implementation**

Modify `packages/worker/scripts/reset.mjs` to add and export `resetD1`.

```javascript
import readline from 'readline';

export async function promptUser(isRemote) {
  if (!isRemote) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("\x1b[31mPERINGATAN: Anda akan menghapus SELURUH data di PRODUCTION. Ketik 'YES' untuk melanjutkan: \x1b[0m", (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}

export function resetD1(execSync, flag) {
  console.log(`\n=> Mereset D1 Database (${flag})...`);
  console.log('Menghapus semua tabel...');
  execSync(`npx wrangler d1 execute omnidrive ${flag} --command="PRAGMA writable_schema = 1; delete from sqlite_master where type in ('table', 'index', 'trigger'); PRAGMA writable_schema = 0; VACUUM;"`, { stdio: 'inherit' });
  
  console.log('Menerapkan schema baru...');
  execSync(`npx wrangler d1 execute omnidrive ${flag} --file=src/db/schema.sql`, { stdio: 'inherit' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/worker && npx vitest run tests/reset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/scripts/reset.mjs packages/worker/tests/reset.test.ts
git commit -m "feat(worker): add D1 wipe and rebuild logic"
```

---

### Task 4: Implement KV Wipe Logic

**Files:**
- Modify: `packages/worker/tests/reset.test.ts`
- Modify: `packages/worker/scripts/reset.mjs`

- [ ] **Step 1: Write the failing test for KV logic**

Modify `packages/worker/tests/reset.test.ts` to add tests for KV logic. Replace the entire file contents with:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { promptUser, resetD1, resetKV } from '../scripts/reset.mjs';

describe('reset.mjs prompt logic', () => {
  it('should return true if not remote', async () => {
    const result = await promptUser(false);
    expect(result).toBe(true);
  });
});

describe('reset.mjs D1 logic', () => {
  it('should execute wrangler d1 commands with correct flag', () => {
    const execSyncMock = vi.fn();
    resetD1(execSyncMock, '--local');
    
    expect(execSyncMock).toHaveBeenCalledTimes(2);
    expect(execSyncMock.mock.calls[0][0]).toContain('d1 execute omnidrive --local --command');
    expect(execSyncMock.mock.calls[0][0]).toContain('delete from sqlite_master');
    expect(execSyncMock.mock.calls[1][0]).toContain('d1 execute omnidrive --local --file=src/db/schema.sql');
  });
});

describe('reset.mjs KV logic', () => {
  it('should fetch keys and execute bulk delete', () => {
    const execSyncMock = vi.fn().mockImplementation((cmd) => {
      if (cmd.includes('kv:key list')) {
        return Buffer.from(JSON.stringify([{ name: 'key1' }, { name: 'key2' }]));
      }
      return Buffer.from('');
    });
    
    const writeFileSyncMock = vi.fn();
    const unlinkSyncMock = vi.fn();
    
    resetKV(execSyncMock, writeFileSyncMock, unlinkSyncMock, '--remote');
    
    expect(execSyncMock).toHaveBeenCalledTimes(2);
    expect(writeFileSyncMock).toHaveBeenCalledWith('temp_keys.json', JSON.stringify(['key1', 'key2']));
    expect(execSyncMock.mock.calls[1][0]).toContain('kv:bulk delete --binding=KV --remote temp_keys.json');
    expect(unlinkSyncMock).toHaveBeenCalledWith('temp_keys.json');
  });

  it('should do nothing if KV is empty', () => {
    const execSyncMock = vi.fn().mockImplementation((cmd) => {
      if (cmd.includes('kv:key list')) {
        return Buffer.from(JSON.stringify([]));
      }
      return Buffer.from('');
    });
    
    const writeFileSyncMock = vi.fn();
    const unlinkSyncMock = vi.fn();
    
    resetKV(execSyncMock, writeFileSyncMock, unlinkSyncMock, '--local');
    
    expect(execSyncMock).toHaveBeenCalledTimes(1);
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/worker && npx vitest run tests/reset.test.ts`
Expected: FAIL because `resetKV` is not exported from `scripts/reset.mjs`.

- [ ] **Step 3: Write minimal implementation**

Modify `packages/worker/scripts/reset.mjs` to add and export `resetKV`.

```javascript
import readline from 'readline';

export async function promptUser(isRemote) {
  // ... (leave existing promptUser code intact)
  if (!isRemote) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("\x1b[31mPERINGATAN: Anda akan menghapus SELURUH data di PRODUCTION. Ketik 'YES' untuk melanjutkan: \x1b[0m", (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}

export function resetD1(execSync, flag) {
  // ... (leave existing resetD1 code intact)
  console.log(`\n=> Mereset D1 Database (${flag})...`);
  console.log('Menghapus semua tabel...');
  execSync(`npx wrangler d1 execute omnidrive ${flag} --command="PRAGMA writable_schema = 1; delete from sqlite_master where type in ('table', 'index', 'trigger'); PRAGMA writable_schema = 0; VACUUM;"`, { stdio: 'inherit' });
  
  console.log('Menerapkan schema baru...');
  execSync(`npx wrangler d1 execute omnidrive ${flag} --file=src/db/schema.sql`, { stdio: 'inherit' });
}

export function resetKV(execSync, writeFileSync, unlinkSync, flag) {
  console.log(`\n=> Mereset KV Namespace (${flag})...`);
  console.log('Mendapatkan daftar keys...');
  const keysOutput = execSync(`npx wrangler kv:key list --binding=KV ${flag}`).toString();
  const keysData = JSON.parse(keysOutput);
  
  if (keysData.length > 0) {
    const keysToDelete = keysData.map(k => k.name);
    writeFileSync('temp_keys.json', JSON.stringify(keysToDelete));
    console.log(`Menghapus ${keysToDelete.length} keys...`);
    execSync(`npx wrangler kv:bulk delete --binding=KV ${flag} temp_keys.json`, { stdio: 'inherit' });
    unlinkSync('temp_keys.json');
  } else {
    console.log('KV Namespace sudah kosong.');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/worker && npx vitest run tests/reset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/scripts/reset.mjs packages/worker/tests/reset.test.ts
git commit -m "feat(worker): add KV bulk delete logic"
```

---

### Task 5: Implement Main Runner

**Files:**
- Modify: `packages/worker/scripts/reset.mjs`

- [ ] **Step 1: Write the main execution script**

Append the execution logic at the bottom of `packages/worker/scripts/reset.mjs`. Use `import.meta.url` to ensure this only runs when the script is executed directly (not when imported by tests). Make sure to add the standard library imports at the very top of the file.

```javascript
import readline from 'readline';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';

export async function promptUser(isRemote) {
  // ... (leave existing promptUser code intact)
  if (!isRemote) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("\x1b[31mPERINGATAN: Anda akan menghapus SELURUH data di PRODUCTION. Ketik 'YES' untuk melanjutkan: \x1b[0m", (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}

export function resetD1(execSyncFn, flag) {
  // ... (leave existing resetD1 code intact)
  console.log(`\n=> Mereset D1 Database (${flag})...`);
  console.log('Menghapus semua tabel...');
  execSyncFn(`npx wrangler d1 execute omnidrive ${flag} --command="PRAGMA writable_schema = 1; delete from sqlite_master where type in ('table', 'index', 'trigger'); PRAGMA writable_schema = 0; VACUUM;"`, { stdio: 'inherit' });
  
  console.log('Menerapkan schema baru...');
  execSyncFn(`npx wrangler d1 execute omnidrive ${flag} --file=src/db/schema.sql`, { stdio: 'inherit' });
}

export function resetKV(execSyncFn, writeFileSyncFn, unlinkSyncFn, flag) {
  // ... (leave existing resetKV code intact)
  console.log(`\n=> Mereset KV Namespace (${flag})...`);
  console.log('Mendapatkan daftar keys...');
  const keysOutput = execSyncFn(`npx wrangler kv:key list --binding=KV ${flag}`).toString();
  const keysData = JSON.parse(keysOutput);
  
  if (keysData.length > 0) {
    const keysToDelete = keysData.map(k => k.name);
    writeFileSyncFn('temp_keys.json', JSON.stringify(keysToDelete));
    console.log(`Menghapus ${keysToDelete.length} keys...`);
    execSyncFn(`npx wrangler kv:bulk delete --binding=KV ${flag} temp_keys.json`, { stdio: 'inherit' });
    unlinkSyncFn('temp_keys.json');
  } else {
    console.log('KV Namespace sudah kosong.');
  }
}

async function main() {
  const isRemote = process.argv.includes('--remote');
  const flag = isRemote ? '--remote' : '--local';

  const confirmed = await promptUser(isRemote);
  if (!confirmed) {
    console.log('Operasi dibatalkan.');
    process.exit(1);
  }

  try {
    resetD1(execSync, flag);
    resetKV(execSync, writeFileSync, unlinkSync, flag);
    console.log('\n=> Selesai! Data berhasil direset.');
  } catch (err) {
    console.error('Terjadi kesalahan selama reset:', err.message);
    process.exit(1);
  }
}

// Only run if executed directly (not when imported in tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
```

- [ ] **Step 2: Run test to verify tests still pass**

Run: `cd packages/worker && npx vitest run tests/reset.test.ts`
Expected: PASS (All tests should still pass, proving the main runner didn't break imports).

- [ ] **Step 3: Commit**

```bash
git add packages/worker/scripts/reset.mjs
git commit -m "feat(worker): wire up reset script main execution"
```
