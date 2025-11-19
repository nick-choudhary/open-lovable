/**
 * Prompt Builder
 * Constructs optimized prompts with caching support
 * KEY OPTIMIZATION: Separates cacheable (system) from dynamic (user) content
 */

import type { FileContext } from '../../types';
import { SYSTEM_PROMPTS, TOKEN_ESTIMATES } from '../../config/builder.config';

export class PromptBuilder {
  /**
   * Build complete prompt with optimal caching strategy
   * Returns separate system and user prompts for Anthropic caching
   */
  buildPrompt(
    userRequest: string,
    context: FileContext,
    conversationContext: string,
    isNewProject: boolean
  ): {
    systemPrompt: string;
    userPrompt: string;
    estimatedTokens: number;
  } {
    // Build system prompt (CACHEABLE - stays same across requests)
    const systemPrompt = this.buildSystemPrompt(isNewProject, context.editIntent.type);

    // Build user prompt (DYNAMIC - changes each request)
    const userPrompt = this.buildUserPrompt(userRequest, context, conversationContext);

    // Estimate tokens
    const estimatedTokens = this.estimateTokens(systemPrompt, userPrompt);

    return {
      systemPrompt,
      userPrompt,
      estimatedTokens,
    };
  }

  /**
   * Build cacheable system prompt
   * This part is cached by Anthropic for 5 minutes
   */
  private buildSystemPrompt(isNewProject: boolean, editType: string): string {
    const sections: string[] = [];

    // Base prompt (always included, always cached)
    sections.push(SYSTEM_PROMPTS.base);

    // Mode-specific additions
    if (isNewProject) {
      sections.push(SYSTEM_PROMPTS.newProject);
    } else {
      sections.push(SYSTEM_PROMPTS.editMode);
    }

    return sections.join('\n\n');
  }

  /**
   * Build dynamic user prompt
   * This changes every request (file contents, user message)
   */
  private buildUserPrompt(
    userRequest: string,
    context: FileContext,
    conversationContext: string
  ): string {
    const sections: string[] = [];

    // Add conversation context if available
    if (conversationContext.trim()) {
      sections.push(conversationContext);
    }

    // Add context-specific instructions
    sections.push(context.systemPrompt);

    // Add files to edit (FULL CONTENT)
    if (Object.keys(context.primaryFiles).length > 0) {
      sections.push(this.formatPrimaryFiles(context.primaryFiles));
    }

    // Add context files (TRUNCATED)
    if (Object.keys(context.contextFiles).length > 0) {
      sections.push(this.formatContextFiles(context.contextFiles));
    }

    // Add user request
    sections.push(`\n## User Request\n${userRequest}`);

    // Add critical reminders
    sections.push(this.getCriticalReminders(context));

    return sections.join('\n\n');
  }

  /**
   * Format primary files (to be edited)
   */
  private formatPrimaryFiles(files: Record<string, string>): string {
    const sections: string[] = [];

    sections.push('## Files to Edit');
    sections.push('🚨 ONLY output these files - NO OTHER FILES 🚨\n');

    for (const [path, content] of Object.entries(files)) {
      const ext = this.getFileExtension(path);
      sections.push(`### ${path}`);
      sections.push('**IMPORTANT: Output the COMPLETE file with your changes**\n');
      sections.push('```' + ext);
      sections.push(content);
      sections.push('```\n');
    }

    return sections.join('\n');
  }

  /**
   * Format context files (for reference only)
   */
  private formatContextFiles(files: Record<string, string>): string {
    const sections: string[] = [];

    sections.push('## Context Files (Reference Only - DO NOT EDIT)');

    for (const [path, content] of Object.entries(files)) {
      const ext = this.getFileExtension(path);
      sections.push(`### ${path}`);
      sections.push('```' + ext);
      sections.push(content);
      sections.push('```\n');
    }

    return sections.join('\n');
  }

  /**
   * Get critical reminders based on context
   */
  private getCriticalReminders(context: FileContext): string {
    const fileCount = Object.keys(context.primaryFiles).length;

    return `
## 🚨 CRITICAL FINAL REMINDERS 🚨

1. **File Count**: You must output EXACTLY ${fileCount} file(s) - NO MORE, NO LESS
2. **Format**: Use <file path="...">content</file> XML tags
3. **Completeness**: NEVER truncate with "..." or ellipsis
4. **Precision**: Change ONLY what was requested

Expected output:
${Object.keys(context.primaryFiles).map(path => `<file path="${path}">...complete code...</file>`).join('\n')}

Anything else = FAILURE`;
  }

  /**
   * Get file extension for syntax highlighting
   */
  private getFileExtension(path: string): string {
    const ext = path.split('.').pop() || '';
    const mapping: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'css': 'css',
      'json': 'json',
      'html': 'html',
    };
    return mapping[ext] || ext;
  }

  /**
   * Estimate total tokens for the request
   */
  private estimateTokens(systemPrompt: string, userPrompt: string): number {
    const systemTokens = Math.ceil(systemPrompt.length / TOKEN_ESTIMATES.CHARS_PER_TOKEN);
    const userTokens = Math.ceil(userPrompt.length / TOKEN_ESTIMATES.CHARS_PER_TOKEN);

    return systemTokens + userTokens;
  }

  /**
   * Calculate token savings from caching
   * Assumes system prompt is cached after first request
   */
  calculateCacheSavings(systemPrompt: string, isFirstRequest: boolean): {
    systemTokens: number;
    cachedTokens: number;
    savings: number;
    savingsPercent: number;
  } {
    const systemTokens = Math.ceil(systemPrompt.length / TOKEN_ESTIMATES.CHARS_PER_TOKEN);

    if (isFirstRequest) {
      return {
        systemTokens,
        cachedTokens: 0,
        savings: 0,
        savingsPercent: 0,
      };
    }

    // After first request, system prompt is cached
    // Anthropic charges ~10% for cache reads vs full tokens
    const cachedTokens = Math.ceil(systemTokens * 0.1);
    const savings = systemTokens - cachedTokens;
    const savingsPercent = Math.round((savings / systemTokens) * 100);

    return {
      systemTokens,
      cachedTokens,
      savings,
      savingsPercent,
    };
  }
}

// Singleton instance
export const promptBuilder = new PromptBuilder();
