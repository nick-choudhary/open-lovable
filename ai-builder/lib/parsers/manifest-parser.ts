/**
 * Manifest Parser
 * Parses project structure to enable intelligent context selection
 * KEY OPTIMIZATION: Understands component relationships for minimal context
 */

import type { FileManifest, FileInfo, ComponentNode, SandboxFile } from '../../types';

export class ManifestParser {
  /**
   * Parse all files and build component relationship graph
   * This enables smart file selection (only send related files to AI)
   */
  async parse(files: Record<string, SandboxFile>): Promise<FileManifest> {
    const manifest: FileManifest = {
      files: {},
      componentTree: {},
      entryPoint: '',
      parsedAt: Date.now(),
    };

    // First pass: Parse each file
    for (const [path, file] of Object.entries(files)) {
      // Skip non-code files
      if (!this.isCodeFile(path)) continue;

      const fileInfo = this.parseFile(path, file.content);
      manifest.files[path] = fileInfo;

      // Track entry point (App.tsx/jsx or main.tsx)
      if (path.match(/App\.(tsx?|jsx?)$/) || path.match(/main\.(tsx?|jsx?)$/)) {
        manifest.entryPoint = path;
      }
    }

    // Second pass: Build component tree (who imports who)
    for (const [path, fileInfo] of Object.entries(manifest.files)) {
      if (fileInfo.componentName) {
        const node: ComponentNode = {
          name: fileInfo.componentName,
          imports: [],
          importedBy: [],
          filePath: path,
        };

        // Find what this component imports
        for (const importPath of fileInfo.imports) {
          const resolvedPath = this.resolveImport(importPath, path, manifest.files);
          if (resolvedPath && manifest.files[resolvedPath]?.componentName) {
            node.imports.push(manifest.files[resolvedPath].componentName!);
          }
        }

        manifest.componentTree[fileInfo.componentName] = node;
      }
    }

    // Third pass: Fill in "importedBy" relationships
    for (const [componentName, node] of Object.entries(manifest.componentTree)) {
      for (const importedComponent of node.imports) {
        if (manifest.componentTree[importedComponent]) {
          manifest.componentTree[importedComponent].importedBy.push(componentName);
        }
      }
    }

    console.log(`[ManifestParser] Parsed ${Object.keys(manifest.files).length} files, ` +
                `${Object.keys(manifest.componentTree).length} components`);

    return manifest;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private parseFile(path: string, content: string): FileInfo {
    return {
      type: this.inferFileType(path, content),
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      componentName: this.extractComponentName(path, content),
      hasState: this.hasStateManagement(content),
      hooks: this.extractHooks(content),
    };
  }

  private isCodeFile(path: string): boolean {
    return /\.(tsx?|jsx?)$/.test(path);
  }

  private inferFileType(path: string, content: string): FileInfo['type'] {
    if (path.includes('/pages/') || path.includes('Page.')) return 'page';
    if (path.includes('/components/')) return 'component';
    if (path.includes('/utils/') || path.includes('/lib/')) return 'utility';
    if (path.match(/\.(css|scss)$/)) return 'style';
    if (path.match(/\.(json|config)$/)) return 'config';

    // Heuristic: Has JSX return statement = component
    if (content.match(/return\s*\(/)) return 'component';

    return 'utility';
  }

  /**
   * Extract import statements
   * Examples:
   *   import Button from './Button'
   *   import { useState } from 'react'
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const regex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract export statements
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // export default Component
    if (content.match(/export\s+default\s+(\w+)/)) {
      exports.push('default');
    }

    // export { Button, Icon }
    const namedExports = content.match(/export\s+\{([^}]+)\}/);
    if (namedExports) {
      const names = namedExports[1].split(',').map(s => s.trim());
      exports.push(...names);
    }

    // export const Button = ...
    const constExports = content.matchAll(/export\s+const\s+(\w+)/g);
    for (const match of constExports) {
      exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Extract component name from file
   * Priority: export default > function name > file name
   */
  private extractComponentName(path: string, content: string): string | undefined {
    // Check for: export default function ComponentName
    let match = content.match(/export\s+default\s+function\s+(\w+)/);
    if (match) return match[1];

    // Check for: export default ComponentName
    match = content.match(/export\s+default\s+(\w+)/);
    if (match) return match[1];

    // Check for: function ComponentName() or const ComponentName =
    match = content.match(/(?:function|const)\s+(\w+)\s*[=(]/);
    if (match && /^[A-Z]/.test(match[1])) return match[1];

    // Fallback: Use filename (Button.tsx -> Button)
    const fileName = path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
    if (fileName && /^[A-Z]/.test(fileName)) return fileName;

    return undefined;
  }

  /**
   * Check if file uses state management hooks
   */
  private hasStateManagement(content: string): boolean {
    return /use(State|Reducer|Context|Ref)/.test(content);
  }

  /**
   * Extract React hooks used
   */
  private extractHooks(content: string): string[] {
    const hooks: string[] = [];
    const hookRegex = /use([A-Z]\w+)/g;
    let match;

    while ((match = hookRegex.exec(content)) !== null) {
      const hookName = 'use' + match[1];
      if (!hooks.includes(hookName)) {
        hooks.push(hookName);
      }
    }

    return hooks;
  }

  /**
   * Resolve relative import to absolute path
   * Example: './Button' from 'src/components/Header.tsx' -> 'src/components/Button.tsx'
   */
  private resolveImport(
    importPath: string,
    fromFile: string,
    allFiles: Record<string, FileInfo>
  ): string | null {
    // Skip node_modules
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    // Get directory of importing file
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));

    // Resolve relative path
    let resolved = importPath;
    if (importPath.startsWith('.')) {
      resolved = this.resolvePath(fromDir, importPath);
    }

    // Try different extensions
    const extensions = ['.tsx', '.ts', '.jsx', '.js', ''];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (allFiles[fullPath]) {
        return fullPath;
      }

      // Try index file
      const indexPath = resolved + '/index' + ext;
      if (allFiles[indexPath]) {
        return indexPath;
      }
    }

    return null;
  }

  /**
   * Resolve relative path segments (.. and .)
   */
  private resolvePath(base: string, relative: string): string {
    const parts = base.split('/');
    const relativeParts = relative.split('/');

    for (const part of relativeParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.') {
        parts.push(part);
      }
    }

    return parts.join('/');
  }
}
