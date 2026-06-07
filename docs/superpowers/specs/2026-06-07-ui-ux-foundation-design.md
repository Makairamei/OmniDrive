# Design Spec: UI/UX Foundation & Design System

## Overview
This document outlines the foundation for a comprehensive UI/UX overhaul of the Omnidrive application. We are establishing the first phase: the Design System and Visual Foundation. This will ensure consistent, premium aesthetics and interactions across the application before we tackle structural layout or complex workflows.

## 1. Visual Language: "High-Tech Minimal"
The overarching aesthetic is "High-Tech Minimal" (similar to Vercel or Linear). It focuses on deep contrast, crisp borders, and vibrant accents, optimizing for a premium, pro-consumer feel.

### Typography
- **Primary Font**: Inter (Google Fonts).
- **Scale & Rhythm**: We will use a tight typescale. Headers will have slightly tighter letter-spacing, while small caps or metadata text will have slightly looser tracking for legibility.

### Core Color Palette (Dark Mode First)
- **Background**: Deep, true-dark (`#0A0A0A`).
- **Elevated Surfaces**: Layered grays for depth (`#1A1A1A` for resting cards/panels, `#242424` for hovers).
- **Primary Text**: Crisp off-white (`#EDEDED`).
- **Secondary Text**: Muted gray (`#888888`).

### Accents & Functional Colors
- **Brand/Action**: Electric Indigo (`#6366F1`).
- **Success**: Emerald green.
- **Destructive/Error**: Rose red.
- **Effects**: Active accent elements will feature a subtle matching drop-shadow/glow to "pop" against the dark background.

## 2. Components & Interactions

### Buttons
- **Style**: Modern, borderless or with a subtle 1px border. Primary buttons will use the Electric Indigo accent with a slight internal gradient.
- **Hover State**: Increased brightness and a soft outer glow.
- **Active State**: Scale down slightly (e.g., `transform: scale(0.98)`) for a tactile, responsive feel.

### Inputs & Form Elements
- **Resting State**: Dark background with a subtle 1px gray border (`#333333`).
- **Focus State**: The border illuminates with the Electric Indigo accent, accompanied by a soft outer focus ring to immediately draw the eye.

### Micro-Animations
- **Behavior**: All interactive state changes (hover, focus, active, dropdowns) will use a fast, snappy easing curve (e.g., `0.15s ease-out` or a CSS spring). The UI must feel instantly responsive without sluggish delays.

## 3. Layout Structure & Technical Strategy

### Spacing Grid
- **System**: A strict 4px-based grid (4, 8, 12, 16, 24, 32px) for all padding, margins, and gaps.

### Technical Implementation
- **Styling**: Implemented in `packages/web` using modern Vanilla CSS (via `index.css` or dedicated theme files). No heavy external styling frameworks.
- **Theming Architecture**: Built entirely on CSS Custom Properties (variables) mapping to colors, spacing, and typography.
- **Future-proofing**: Variables will be structured to support the primary Dark Mode layout, with an easy path to implementing a Light Mode toggle in the future via a data-attribute or media query.
