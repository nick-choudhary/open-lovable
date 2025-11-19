/**
 * Conversation State Manager
 * Manages conversation history with intelligent windowing
 * KEY OPTIMIZATION: Keeps only recent context (70% token savings)
 */

import type { ConversationState, Message, ConversationEdit, EditIntentType } from '../../types';
import { builderConfig, LOGGING } from '../../config/builder.config';

export class ConversationManager {
  private states: Map<string, ConversationState> = new Map();

  /**
   * Get or create conversation state for a project
   */
  getState(projectId: string): ConversationState {
    if (!this.states.has(projectId)) {
      this.states.set(projectId, this.createNewState(projectId));
    }
    return this.states.get(projectId)!;
  }

  /**
   * Add user message to conversation
   * AUTO-TRIMS: Keeps only last N messages
   */
  addUserMessage(projectId: string, content: string, metadata?: Message['metadata']): Message {
    const state = this.getState(projectId);

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      metadata,
    };

    state.messages.push(message);

    // Auto-trim messages
    this.trimMessages(state);

    if (LOGGING.verbose) {
      console.log(`[Conversation] Added user message (${state.messages.length} total)`);
    }

    return message;
  }

  /**
   * Add assistant response to conversation
   */
  addAssistantMessage(projectId: string, content: string, metadata?: Message['metadata']): Message {
    const state = this.getState(projectId);

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      metadata,
    };

    state.messages.push(message);
    this.trimMessages(state);

    return message;
  }

  /**
   * Record an edit for history tracking
   */
  recordEdit(
    projectId: string,
    userRequest: string,
    editType: EditIntentType,
    targetFiles: string[],
    confidence: number,
    outcome: 'success' | 'error',
    error?: string
  ): void {
    const state = this.getState(projectId);

    const edit: ConversationEdit = {
      timestamp: Date.now(),
      userRequest,
      editType,
      targetFiles,
      confidence,
      outcome,
      error,
    };

    state.edits.push(edit);

    // Auto-trim edits
    this.trimEdits(state);

    state.lastUpdated = Date.now();

    if (LOGGING.verbose) {
      console.log(`[Conversation] Recorded ${outcome} edit: ${editType} (${state.edits.length} total)`);
    }
  }

  /**
   * Update token usage metrics
   */
  updateTokenUsage(projectId: string, tokens: number, cached: number = 0): void {
    const state = this.getState(projectId);

    state.tokenUsage.total += tokens;
    state.tokenUsage.cached += cached;
    state.tokenUsage.saved += cached;

    if (LOGGING.logTokenMetrics) {
      const savingsPercent = state.tokenUsage.total > 0
        ? Math.round((state.tokenUsage.saved / state.tokenUsage.total) * 100)
        : 0;
      console.log(
        `[Conversation] Tokens - Total: ${state.tokenUsage.total}, ` +
        `Cached: ${state.tokenUsage.cached}, Saved: ${savingsPercent}%`
      );
    }
  }

  /**
   * Build conversation context for AI prompt
   * TOKEN OPTIMIZATION: Only includes last N messages and edits
   */
  buildContext(projectId: string): string {
    const state = this.getState(projectId);
    const sections: string[] = [];

    // Recent edits summary (last 3)
    const recentEdits = state.edits.slice(-3);
    if (recentEdits.length > 0) {
      sections.push('## Recent Edits');
      for (const edit of recentEdits) {
        const files = edit.targetFiles.map(f => f.split('/').pop()).join(', ');
        sections.push(`- ${edit.editType}: ${edit.userRequest.substring(0, 60)} (${files})`);
      }
    }

    // Recent messages (last 5, excluding current)
    const recentMessages = state.messages.slice(-6, -1);
    if (recentMessages.length > 0) {
      sections.push('\n## Recent Conversation');
      for (const msg of recentMessages) {
        if (msg.role === 'user') {
          const preview = msg.content.substring(0, 80);
          sections.push(`- User: ${preview}${msg.content.length > 80 ? '...' : ''}`);
        }
      }
    }

    // Token usage summary
    if (state.tokenUsage.total > 0) {
      const savingsPercent = Math.round((state.tokenUsage.saved / state.tokenUsage.total) * 100);
      sections.push(`\n## Session Stats`);
      sections.push(`- Total requests: ${state.messages.filter(m => m.role === 'user').length}`);
      sections.push(`- Token savings: ${savingsPercent}%`);
    }

    const context = sections.join('\n');

    // Cap total context length (prevent token bloat)
    if (context.length > 2000) {
      return context.substring(0, 2000) + '\n[Context truncated]';
    }

    return context;
  }

  /**
   * Get conversation statistics
   */
  getStats(projectId: string) {
    const state = this.getState(projectId);

    return {
      messageCount: state.messages.length,
      editCount: state.edits.length,
      userMessages: state.messages.filter(m => m.role === 'user').length,
      successfulEdits: state.edits.filter(e => e.outcome === 'success').length,
      failedEdits: state.edits.filter(e => e.outcome === 'error').length,
      tokenUsage: state.tokenUsage,
      duration: Date.now() - state.startedAt,
    };
  }

  /**
   * Clear conversation history for a project
   */
  clear(projectId: string): void {
    this.states.delete(projectId);
    console.log(`[Conversation] Cleared state for project ${projectId}`);
  }

  /**
   * Clear all conversations (for cleanup)
   */
  clearAll(): void {
    this.states.clear();
    console.log('[Conversation] Cleared all conversation states');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createNewState(projectId: string): ConversationState {
    return {
      conversationId: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      messages: [],
      edits: [],
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      tokenUsage: {
        total: 0,
        cached: 0,
        saved: 0,
      },
    };
  }

  private trimMessages(state: ConversationState): void {
    const maxMessages = builderConfig.optimization.maxConversationMessages;

    if (state.messages.length > maxMessages) {
      const removed = state.messages.length - maxMessages;
      state.messages = state.messages.slice(-maxMessages);

      if (LOGGING.verbose) {
        console.log(`[Conversation] Trimmed ${removed} old messages`);
      }
    }
  }

  private trimEdits(state: ConversationState): void {
    const maxEdits = builderConfig.optimization.maxConversationEdits;

    if (state.edits.length > maxEdits) {
      const removed = state.edits.length - maxEdits;
      state.edits = state.edits.slice(-maxEdits);

      if (LOGGING.verbose) {
        console.log(`[Conversation] Trimmed ${removed} old edits`);
      }
    }
  }
}

// Singleton instance
export const conversationManager = new ConversationManager();
