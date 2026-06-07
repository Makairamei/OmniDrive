# UI/UX Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the new "High-Tech Minimal" visual foundation in the global CSS.

**Architecture:** Update `packages/web/src/index.css` to define the new CSS Custom Properties (true-dark mode, tighter typescale) and update base component styles (buttons, inputs) with new micro-animations and glows.

**Tech Stack:** React, Vanilla CSS

---

### Task 1: Update Core Color Palette and Transitions

**Files:**
- Modify: `packages/web/src/index.css`

- [ ] **Step 1: Replace Dark Theme Colors in `:root`**

Update the `--bg-*`, `--border-*`, and `--text-*` variables in `packages/web/src/index.css` to match the High-Tech Minimal spec.

```css
  /* Colors — Dark Theme */
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-tertiary: #161616;
  --bg-elevated: #1a1a1a;
  --bg-hover: #242424;
  --bg-active: #2d2d2d;

  --border-subtle: #222222;
  --border-default: #333333;
  --border-strong: #444444;

  --text-primary: #ededed;
  --text-secondary: #a1a1aa;
  --text-tertiary: #888888;
  --text-inverse: #0a0a0a;
```

- [ ] **Step 2: Update Micro-animation Transitions**

Update the `--transition-*` variables for snappy animations:

```css
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
```

- [ ] **Step 3: Verify CSS Compilation**

Run: `npm run build:web`
Expected: success (no compilation errors)

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/index.css
git commit -m "style: update core colors and transitions for high-tech minimal design"
```

### Task 2: Update Button Component Styles

**Files:**
- Modify: `packages/web/src/index.css`

- [ ] **Step 1: Add Active Scale State to Base Button**

Add `transform` to `.btn:active` to create a tactile feel. Add this below `.btn`:

```css
.btn:active {
  transform: scale(0.98);
}
```

- [ ] **Step 2: Add Subtle Gradient and Glow to Primary Button**

Update `.btn-primary` and `.btn-primary:hover`:

```css
.btn-primary {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%), var(--accent-primary);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-primary:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%), var(--accent-primary-hover);
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
}
```

- [ ] **Step 3: Verify CSS Compilation**

Run: `npm run build:web`
Expected: success (no compilation errors)

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/index.css
git commit -m "style: update button micro-animations and primary glow"
```

### Task 3: Update Input Form Element Styles

**Files:**
- Modify: `packages/web/src/index.css`

- [ ] **Step 1: Update Input Focus State**

Update `input:focus, textarea:focus, select:focus` to include an outer focus ring:

```css
input:focus, textarea:focus, select:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 1px var(--bg-primary), 0 0 0 3px var(--accent-primary-subtle);
}
```

- [ ] **Step 2: Verify CSS Compilation**

Run: `npm run build:web`
Expected: success (no compilation errors)

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/index.css
git commit -m "style: refine input focus ring and border interactions"
```
