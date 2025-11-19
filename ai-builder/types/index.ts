/**
 * Core TypeScript types for AI Builder
 * Production-ready type definitions with full documentation
 */

// ============================================================================
// File & Cache Types
// ============================================================================

export interface SandboxFile {
  content: string;
  lastModified: number;
  size: number;
}

export interface FileManifest {
  files: Record<string, FileInfo>;
  componentTree: Record<string, ComponentNode>;
  entryPoint: string;
  parsedAt: number;
}

export interface FileInfo {
  type: 'component' | 'page' | 'utility' | 'style' | 'config';
  imports: string[];
  exports: string[];
  componentName?: string;
  hasState: boolean;
  hooks: string[];
}

export interface ComponentNode {
  name: string;
  imports: string[];      // Components this imports
  importedBy: string[];   // Components that import this
  filePath: string;
}

export interface FileCache {
  files: Record<string, SandboxFile>;
  manifest: FileManifest | null;
  lastSync: number;
  projectId: string;
}

// ============================================================================
// Conversation & Intent Types
// ============================================================================

export type EditIntentType =
  | 'UPDATE_COMPONENT'
  | 'ADD_FEATURE'
  | 'FIX_ISSUE'
  | 'UPDATE_STYLE'
  | 'REFACTOR'
  | 'FULL_REBUILD';

export interface EditIntent {
  type: EditIntentType;
  targetFiles: string[];
  confidence: number;
  description: string;
  searchTerms?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    tokenCount?: number;
    filesEdited?: string[];
    error?: string;
  };
}

export interface ConversationEdit {
  timestamp: number;
  userRequest: string;
  editType: EditIntentType;
  targetFiles: string[];
  confidence: number;
  outcome: 'success' | 'error';
  error?: string;
}

export interface ConversationState {
  conversationId: string;
  projectId: string;
  messages: Message[];
  edits: ConversationEdit[];
  startedAt: number;
  lastUpdated: number;
  tokenUsage: {
    total: number;
    cached: number;
    saved: number;
  };
}

// ============================================================================
// Context Selection Types
// ============================================================================

export interface FileContext {
  primaryFiles: Record<string, string>;   // Files to edit (full content)
  contextFiles: Record<string, string>;   // Reference files (may be truncated)
  systemPrompt: string;
  editIntent: EditIntent;
  estimatedTokens: number;
}

export interface ContextSelectionOptions {
  maxContextFiles?: number;
  maxContextFileSize?: number;  // Chars per context file
  includeManifest?: boolean;
  forceFullContext?: boolean;
}

// ============================================================================
// Sandbox & Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  lastModified: number;
  vitePort?: number;
  isRunning: boolean;
}

export interface ViteProcess {
  pid: number;
  port: number;
  startedAt: number;
  url: string;
}

export interface SandboxState {
  project: Project;
  viteProcess: ViteProcess | null;
  fileCache: FileCache;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    tokenCount?: number;
    executionTime?: number;
    cached?: boolean;
  };
}

export interface ChatStreamEvent {
  type: 'status' | 'stream' | 'complete' | 'error' | 'package' | 'file';
  message?: string;
  text?: string;
  generatedCode?: string;
  files?: number;
  tokenEstimate?: number;
  packageName?: string;
  error?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface BuilderConfig {
  ai: {
    provider: 'anthropic' | 'openai' | 'google';
    model: string;
    temperature: number;
    maxTokens: number;
    enableCaching: boolean;
  };
  sandbox: {
    projectsDir: string;
    defaultPort: number;
    portRange: [number, number];
  };
  optimization: {
    maxConversationMessages: number;
    maxConversationEdits: number;
    maxContextFiles: number;
    contextFileTruncateAt: number;
    manifestCacheTTL: number;  // milliseconds
    enableAggressiveCaching: boolean;
  };
  security: {
    allowedFileTypes: string[];
    maxFileSize: number;
    sandboxTimeout: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export interface TokenMetrics {
  systemPrompt: number;
  userPrompt: number;
  context: number;
  total: number;
  cached: number;
  savings: number;
  savingsPercent: number;
}

export interface ParsedFile {
  path: string;
  content: string;
  language: string;
}
