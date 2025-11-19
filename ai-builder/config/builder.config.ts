/**
 * Production Configuration for AI Builder
 * Centralized settings for optimization, security, and AI behavior
 */

import type { BuilderConfig } from '../types';

export const builderConfig: BuilderConfig = {
  // ============================================================================
  // AI Configuration
  // ============================================================================
  ai: {
    // Provider selection (anthropic recommended for prompt caching)
    provider: (process.env.AI_PROVIDER as any) || 'anthropic',

    // Default model (Claude Sonnet for best cost/performance with caching)
    model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',

    // Temperature (0.7 for balanced creativity/consistency)
    temperature: 0.7,

    // Max tokens per request (8192 ensures complete files)
    maxTokens: 8192,

    // Enable Anthropic prompt caching (90% cost savings)
    enableCaching: true,
  },

  // ============================================================================
  // Sandbox Configuration
  // ============================================================================
  sandbox: {
    // Where projects are stored
    projectsDir: process.env.PROJECTS_DIR || './projects',

    // Default Vite dev server port
    defaultPort: 5173,

    // Port range for multiple projects
    portRange: [5173, 5200] as [number, number],
  },

  // ============================================================================
  // Token Optimization Settings
  // ============================================================================
  optimization: {
    // Max messages to keep in conversation history
    // Older messages are summarized or dropped
    maxConversationMessages: 10,

    // Max edit records to keep
    maxConversationEdits: 8,

    // Max context files to include (beyond primary files)
    maxContextFiles: 3,

    // Truncate context files after N characters
    // Primary files are never truncated
    contextFileTruncateAt: 1000,

    // How long to cache manifest (5 minutes)
    manifestCacheTTL: 5 * 60 * 1000,

    // Enable all caching optimizations
    enableAggressiveCaching: true,
  },

  // ============================================================================
  // Security Settings
  // ============================================================================
  security: {
    // Only allow these file extensions
    allowedFileTypes: [
      '.js', '.jsx', '.ts', '.tsx',
      '.css', '.json', '.html',
      '.md', '.txt', '.env.example'
    ],

    // Max file size (5MB)
    maxFileSize: 5 * 1024 * 1024,

    // Sandbox process timeout (30 minutes)
    sandboxTimeout: 30 * 60 * 1000,
  },
};

// ============================================================================
// System Prompt Templates
// ============================================================================

export const SYSTEM_PROMPTS = {
  // Base prompt (cached across all requests)
  base: `You are an expert React developer specializing in modern web applications.
Generate clean, production-ready React code using Vite and Tailwind CSS.

## Core Principles
1. **Functional Components**: Always use functional components with hooks
2. **Tailwind CSS**: Use Tailwind utilities for ALL styling (no separate CSS files except index.css)
3. **Type Safety**: Prefer TypeScript when possible
4. **Modern Patterns**: Use latest React patterns (hooks, context, suspense)
5. **Accessibility**: Include ARIA labels and semantic HTML
6. **Performance**: Optimize for bundle size and runtime performance

## File Output Format
ALWAYS output files in this exact XML format:

<file path="src/components/Button.tsx">
// Complete file content here
</file>

## Critical Rules
- NEVER truncate code with "..." or ellipsis
- ALWAYS include complete imports, exports, and closing tags
- NEVER create duplicate files - check existing files first
- PRESERVE existing functionality unless explicitly asked to change
- Use ONLY standard Tailwind classes (bg-blue-500, NOT bg-primary)

## Package Management
- Import packages normally: import { motion } from 'framer-motion'
- System will auto-detect and install missing packages
- Only use well-maintained, popular packages`,

  // Edit mode additions (appended for incremental updates)
  editMode: `
## 🚨 EDIT MODE - SURGICAL CHANGES ONLY 🚨

This is an incremental update to an existing application.

### Mandatory Rules:
1. **Minimal Changes**: Only modify what's explicitly requested
2. **File Count Limit**:
   - Simple edit (color, text) = 1 file ONLY
   - New component = 2 files MAX (component + parent)
   - Complex feature = 3 files MAX
3. **Preservation**: Keep ALL existing functionality, imports, and structure
4. **No Refactoring**: Don't "improve" code unless explicitly asked
5. **Target Precision**: Edit specific files, not entire application

### Examples of CORRECT Behavior:
✅ "Change header color" → Edit ONLY Header.tsx, change ONLY the color class
✅ "Add button to hero" → Edit ONLY Hero.tsx, ADD button, keep everything else
✅ "Create ContactForm" → Create ContactForm.tsx + update App.tsx to import it

### Examples of FAILURES:
❌ "Change header color" → Regenerate Header + Nav + Footer
❌ "Add button" → Rewrite entire component from scratch
❌ "Fix bug" → Refactor multiple unrelated files`,

  // First generation mode
  newProject: `
## 🎨 NEW PROJECT MODE - CREATE SOMETHING BEAUTIFUL

This is the user's first experience with this application. Make it impressive!

### Requirements:
1. **Complete Application**: Include Header, Hero, Features/Content, Footer
2. **Visual Polish**: Use shadows, gradients, transitions, hover states
3. **Responsive Design**: Mobile-first with proper breakpoints (sm:, md:, lg:)
4. **Real Content**: No "Lorem ipsum" - use realistic placeholder content
5. **Modern Aesthetics**: Clean, professional design with good typography

### File Structure:
- src/App.tsx - Main app component
- src/components/Header.tsx - Navigation
- src/components/Hero.tsx - Landing section
- src/components/Features.tsx - Key features
- src/components/Footer.tsx - Footer with links
- src/index.css - Tailwind directives only

### Do NOT Create:
- tailwind.config.js (auto-generated)
- vite.config.ts (auto-generated)
- package.json (managed by system)`,
};

// ============================================================================
// Token Estimation Constants
// ============================================================================

export const TOKEN_ESTIMATES = {
  // Rough character-to-token ratio
  CHARS_PER_TOKEN: 4,

  // System prompt sizes (with caching)
  BASE_PROMPT_TOKENS: 600,
  EDIT_MODE_ADDITION: 200,
  NEW_PROJECT_ADDITION: 150,

  // Typical file sizes
  SMALL_COMPONENT: 500,      // ~125 tokens
  MEDIUM_COMPONENT: 2000,    // ~500 tokens
  LARGE_COMPONENT: 4000,     // ~1000 tokens

  // Context overhead
  FILE_WRAPPER_OVERHEAD: 50,  // <file path="..."> tags
  MANIFEST_OVERHEAD: 200,     // File structure info
};

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  NO_PROJECT: 'No active project. Create a project first.',
  INVALID_FILE_TYPE: 'File type not allowed for security reasons.',
  FILE_TOO_LARGE: 'File exceeds maximum size limit.',
  VITE_START_FAILED: 'Failed to start Vite dev server.',
  AI_GENERATION_FAILED: 'AI code generation failed. Please try again.',
  CACHE_CORRUPTED: 'File cache corrupted. Regenerating...',
  MANIFEST_PARSE_ERROR: 'Failed to parse project structure.',
};

// ============================================================================
// Logging Configuration
// ============================================================================

export const LOGGING = {
  // Enable detailed logging
  verbose: process.env.NODE_ENV === 'development',

  // Log token usage metrics
  logTokenMetrics: true,

  // Log cache hits/misses
  logCacheMetrics: true,

  // Log file operations
  logFileOps: process.env.NODE_ENV === 'development',
};
