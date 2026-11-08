# NEXUS Frontend — React 19 & Monaco Codebase Intelligence UI

This directory contains the frontend interface for **NEXUS**, built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Zustand**, **TanStack Query**, and **Monaco Editor**.

## Core Modules (`src/`)

- **Pages (`src/pages/`):**
  - `Dashboard.tsx` — Project health metrics, indexing status, and recent activity timeline
  - `CodeExplorer.tsx` — File tree navigation, AST symbol search, and Monaco code viewer
  - `Assistant.tsx` — Local RAG chat interface and context-aware codebase queries
  - `Settings.tsx` — Local LLM (Ollama), RAG chunking, Git, and Nexus Guard configuration
- **Key Components (`src/components/`):**
  - `CodebaseIntelligence.tsx` — Symbol and dependency relationship explorer
  - `ChangeCenter.tsx` & `DiffEditorCard.tsx` — Controlled side-by-side diff preview and approval workflow
  - `NexusGuard.tsx` — Security validation and risk inspection before applying AI edits
  - `CommandPalette.tsx` — Keyboard-first navigation (`Ctrl+K`)

## Development & Testing

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run unit tests (Vitest + Testing Library)
npm test

# Type-check and build production bundle
npm run build
```
