/**
 * Context Selector
 * Intelligently selects which files to send to AI based on user intent
 * KEY OPTIMIZATION: Sends minimal context (80-95% token savings on edits)
 */

import type {
  FileManifest,
  EditIntent,
  EditIntentType,
  FileContext,
  SandboxFile,
  ContextSelectionOptions,
} from '../../types';
import { builderConfig, TOKEN_ESTIMATES } from '../../config/builder.config';

export class ContextSelector {
  /**
   * Main entry point: Analyze intent and select optimal context
   * TOKEN SAVINGS: Simple edits use 1 file vs 20+ files (95% savings)
   */
  selectContext(
    userPrompt: string,
    files: Record<string, SandboxFile>,
    manifest: FileManifest | null,
    options: ContextSelectionOptions = {}
  ): FileContext {
    // Analyze user intent
    const intent = this.analyzeIntent(userPrompt, manifest);

    // Select files based on intent
    const { primaryFiles, contextFiles } = this.selectFiles(intent, files, manifest, options);

    // Build optimized system prompt
    const systemPrompt = this.buildSystemPrompt(intent, manifest);

    // Estimate token usage
    const estimatedTokens = this.estimateTokens(primaryFiles, contextFiles, systemPrompt);

    console.log(
      `[ContextSelector] Intent: ${intent.type}, Primary: ${Object.keys(primaryFiles).length}, ` +
        `Context: ${Object.keys(contextFiles).length}, Est. tokens: ${estimatedTokens}`
    );

    return {
      primaryFiles,
      contextFiles,
      systemPrompt,
      editIntent: intent,
      estimatedTokens,
    };
  }

  // ============================================================================
  // Intent Analysis
  // ============================================================================

  /**
   * Analyze user prompt to determine edit intent
   * Uses regex patterns for fast classification
   */
  private analyzeIntent(prompt: string, manifest: FileManifest | null): EditIntent {
    const lower = prompt.toLowerCase();

    // Pattern matching for intent types
    const patterns: Array<{ type: EditIntentType; regex: RegExp }> = [
      { type: 'UPDATE_STYLE', regex: /change|update|make.*?(color|background|style|theme|gradient|font)/ },
      { type: 'UPDATE_COMPONENT', regex: /update|change|modify|edit|fix.*?(button|header|nav|footer|component)/ },
      { type: 'ADD_FEATURE', regex: /add|create|new|implement|build.*?(component|feature|page|section)/ },
      { type: 'FIX_ISSUE', regex: /fix|debug|resolve|repair.*?(bug|error|issue|problem)/ },
      { type: 'REFACTOR', regex: /refactor|clean|optimize|reorganize/ },
      { type: 'FULL_REBUILD', regex: /rebuild|recreate|start over|from scratch/ },
    ];

    for (const { type, regex } of patterns) {
      if (regex.test(lower)) {
        const targetFiles = this.findTargetFiles(prompt, type, manifest);
        const confidence = this.calculateConfidence(prompt, type, targetFiles);

        return {
          type,
          targetFiles,
          confidence,
          description: this.generateDescription(type, prompt, targetFiles),
        };
      }
    }

    // Default: general update
    return {
      type: 'UPDATE_COMPONENT',
      targetFiles: manifest ? [manifest.entryPoint] : [],
      confidence: 0.5,
      description: 'General code update',
    };
  }

  /**
   * Find target files based on intent and prompt content
   */
  private findTargetFiles(prompt: string, type: EditIntentType, manifest: FileManifest | null): string[] {
    if (!manifest) return [];

    const lower = prompt.toLowerCase();
    const files: string[] = [];

    // Extract component names from prompt
    const componentWords = this.extractComponentNames(prompt);

    // Search for matching files
    for (const [path, fileInfo] of Object.entries(manifest.files)) {
      // Check if component name matches
      if (fileInfo.componentName) {
        const componentLower = fileInfo.componentName.toLowerCase();
        if (componentWords.some((word) => componentLower.includes(word))) {
          files.push(path);
        }
      }

      // Check if path contains keywords
      const pathLower = path.toLowerCase();
      if (componentWords.some((word) => pathLower.includes(word))) {
        files.push(path);
      }
    }

    // Remove duplicates
    const unique = [...new Set(files)];

    // Limit results based on intent type
    if (type === 'UPDATE_STYLE' || type === 'UPDATE_COMPONENT') {
      return unique.slice(0, 1); // Only first match for simple edits
    }

    if (type === 'ADD_FEATURE') {
      return unique.slice(0, 2); // New component + parent
    }

    return unique.slice(0, 3); // Max 3 files for complex edits
  }

  /**
   * Extract potential component names from prompt
   */
  private extractComponentNames(prompt: string): string[] {
    const words: string[] = [];

    // Common component keywords
    const keywords = [
      'header',
      'footer',
      'nav',
      'navigation',
      'hero',
      'button',
      'card',
      'modal',
      'form',
      'input',
      'sidebar',
      'menu',
    ];

    for (const keyword of keywords) {
      if (prompt.toLowerCase().includes(keyword)) {
        words.push(keyword);
      }
    }

    // Extract capitalized words (likely component names)
    const capitalizedWords = prompt.match(/\b[A-Z][a-z]+\b/g) || [];
    words.push(...capitalizedWords.map((w) => w.toLowerCase()));

    return [...new Set(words)];
  }

  // ============================================================================
  // File Selection
  // ============================================================================

  /**
   * Select primary and context files based on intent
   * Primary files: Sent in full (will be edited)
   * Context files: Truncated (for reference only)
   */
  private selectFiles(
    intent: EditIntent,
    files: Record<string, SandboxFile>,
    manifest: FileManifest | null,
    options: ContextSelectionOptions
  ): { primaryFiles: Record<string, string>; contextFiles: Record<string, string> } {
    const maxContextFiles = options.maxContextFiles ?? builderConfig.optimization.maxContextFiles;
    const maxContextFileSize = options.maxContextFileSize ?? builderConfig.optimization.contextFileTruncateAt;

    const primaryFiles: Record<string, string> = {};
    const contextFiles: Record<string, string> = {};

    // Add primary files (full content)
    for (const targetPath of intent.targetFiles) {
      if (files[targetPath]) {
        primaryFiles[targetPath] = files[targetPath].content;
      }
    }

    // For simple edits, no context needed!
    if (intent.type === 'UPDATE_STYLE' || (intent.type === 'UPDATE_COMPONENT' && intent.confidence > 0.8)) {
      console.log('[ContextSelector] Simple edit - skipping context files');
      return { primaryFiles, contextFiles };
    }

    // Add key context files (App.tsx, package.json, etc.)
    const keyFiles = this.getKeyFiles(manifest);

    for (const keyPath of keyFiles.slice(0, maxContextFiles)) {
      if (!primaryFiles[keyPath] && files[keyPath]) {
        const content = files[keyPath].content;
        // Truncate large context files
        contextFiles[keyPath] = content.length > maxContextFileSize ? content.substring(0, maxContextFileSize) + '\n// ... [truncated]' : content;
      }
    }

    return { primaryFiles, contextFiles };
  }

  /**
   * Get key files that should always be included as context
   */
  private getKeyFiles(manifest: FileManifest | null): string[] {
    if (!manifest) return [];

    const keyFiles: string[] = [];

    // Entry point (App.tsx) - shows overall structure
    if (manifest.entryPoint) {
      keyFiles.push(manifest.entryPoint);
    }

    // package.json - shows dependencies
    const packageJson = Object.keys(manifest.files).find((p) => p.endsWith('package.json'));
    if (packageJson) {
      keyFiles.push(packageJson);
    }

    // tailwind.config - shows design system
    const tailwindConfig = Object.keys(manifest.files).find((p) => p.includes('tailwind.config'));
    if (tailwindConfig) {
      keyFiles.push(tailwindConfig);
    }

    return keyFiles;
  }

  // ============================================================================
  // Prompt Building
  // ============================================================================

  /**
   * Build system prompt with intent-specific instructions
   */
  private buildSystemPrompt(intent: EditIntent, manifest: FileManifest | null): string {
    const sections: string[] = [];

    // Add edit intent info
    sections.push(`## Edit Intent
Type: ${intent.type}
Description: ${intent.description}
Confidence: ${Math.round(intent.confidence * 100)}%
Target Files: ${intent.targetFiles.join(', ') || 'To be determined'}`);

    // Add file structure if available
    if (manifest) {
      sections.push(this.buildFileStructureSection(manifest));
    }

    // Add intent-specific instructions
    sections.push(this.getIntentInstructions(intent.type));

    return sections.join('\n\n');
  }

  /**
   * Build file structure section for prompt
   */
  private buildFileStructureSection(manifest: FileManifest): string {
    const allFiles = Object.keys(manifest.files).sort();

    return `## Project Structure (${allFiles.length} files)

Files:
${allFiles.map((f) => `- ${f}`).join('\n')}

Entry Point: ${manifest.entryPoint}

Components: ${Object.keys(manifest.componentTree).join(', ')}`;
  }

  /**
   * Get instructions specific to intent type
   */
  private getIntentInstructions(type: EditIntentType): string {
    const instructions: Record<EditIntentType, string> = {
      UPDATE_COMPONENT: `## Instructions: UPDATE COMPONENT
- Make MINIMAL changes to existing component
- Preserve ALL existing functionality
- Only modify what was explicitly requested
- Return COMPLETE file (no truncation)`,

      ADD_FEATURE: `## Instructions: ADD FEATURE
- Create new component in appropriate directory
- Update parent component to import and use it
- Follow existing code patterns
- Ensure proper integration`,

      FIX_ISSUE: `## Instructions: FIX ISSUE
- Identify and fix the specific problem
- Don't change unrelated code
- Test that fix doesn't break other functionality
- Add error handling if needed`,

      UPDATE_STYLE: `## Instructions: UPDATE STYLE
- Change ONLY the specific style mentioned
- Use Tailwind utility classes
- Don't modify component structure
- Preserve all other classes and styles`,

      REFACTOR: `## Instructions: REFACTOR
- Improve code quality without changing behavior
- Follow project conventions
- Maintain all existing features
- Improve readability and maintainability`,

      FULL_REBUILD: `## Instructions: FULL REBUILD
- You may rebuild the entire application
- Improve upon existing design
- Use modern best practices
- Ensure all features work correctly`,
    };

    return instructions[type];
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Calculate confidence score for intent detection
   */
  private calculateConfidence(prompt: string, type: EditIntentType, targetFiles: string[]): number {
    let confidence = 0.5;

    // Higher confidence if we found specific files
    if (targetFiles.length > 0) {
      confidence += 0.3;
    }

    // Higher confidence for detailed prompts
    if (prompt.split(' ').length > 5) {
      confidence += 0.1;
    }

    // Lower confidence for ambiguous requests
    if (targetFiles.length > 3) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(type: EditIntentType, prompt: string, targetFiles: string[]): string {
    const fileNames = targetFiles.map((f) => f.split('/').pop()).join(', ');

    const typeDescriptions: Record<EditIntentType, string> = {
      UPDATE_COMPONENT: `Updating ${fileNames || 'component'}`,
      ADD_FEATURE: `Adding feature to ${fileNames || 'application'}`,
      FIX_ISSUE: `Fixing issue in ${fileNames || 'code'}`,
      UPDATE_STYLE: `Updating styles in ${fileNames || 'components'}`,
      REFACTOR: `Refactoring ${fileNames || 'code'}`,
      FULL_REBUILD: 'Rebuilding entire application',
    };

    return typeDescriptions[type];
  }

  /**
   * Estimate token usage for selected context
   */
  private estimateTokens(
    primaryFiles: Record<string, string>,
    contextFiles: Record<string, string>,
    systemPrompt: string
  ): number {
    const systemTokens = Math.ceil(systemPrompt.length / TOKEN_ESTIMATES.CHARS_PER_TOKEN);

    const primaryTokens = Object.values(primaryFiles).reduce(
      (sum, content) => sum + Math.ceil(content.length / TOKEN_ESTIMATES.CHARS_PER_TOKEN),
      0
    );

    const contextTokens = Object.values(contextFiles).reduce(
      (sum, content) => sum + Math.ceil(content.length / TOKEN_ESTIMATES.CHARS_PER_TOKEN),
      0
    );

    return systemTokens + primaryTokens + contextTokens + TOKEN_ESTIMATES.BASE_PROMPT_TOKENS;
  }
}

// Singleton instance
export const contextSelector = new ContextSelector();
