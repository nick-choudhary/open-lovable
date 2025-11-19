/**
 * Local Sandbox Manager
 * Manages projects on local filesystem with isolated directories
 * Handles file I/O, project creation, and npm operations
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Project, SandboxFile } from '../../types';
import { builderConfig, ERROR_MESSAGES } from '../../config/builder.config';
import { fileCacheManager } from '../cache/file-cache';

const execAsync = promisify(exec);

export class LocalSandbox {
  private projects: Map<string, Project> = new Map();
  private projectsDir: string;

  constructor() {
    this.projectsDir = builderConfig.sandbox.projectsDir;

    // Connect file cache to this sandbox's disk fetcher
    fileCacheManager.setDiskFetcher(this.fetchFilesFromDisk.bind(this));
  }

  /**
   * Initialize sandbox (create projects directory if needed)
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.projectsDir, { recursive: true });
      console.log(`[LocalSandbox] Initialized at ${this.projectsDir}`);
    } catch (error) {
      console.error('[LocalSandbox] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create a new project with Vite + React template
   */
  async createProject(name: string): Promise<Project> {
    const projectId = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const projectPath = join(this.projectsDir, projectId);

    console.log(`[LocalSandbox] Creating project: ${projectId}`);

    try {
      // Create project directory
      await fs.mkdir(projectPath, { recursive: true });

      // Initialize with Vite React template
      await this.initializeViteProject(projectPath);

      // Create project record
      const project: Project = {
        id: projectId,
        name,
        path: projectPath,
        createdAt: Date.now(),
        lastModified: Date.now(),
        isRunning: false,
      };

      this.projects.set(projectId, project);

      console.log(`[LocalSandbox] Project created: ${projectId}`);

      return project;
    } catch (error) {
      console.error(`[LocalSandbox] Failed to create project:`, error);
      throw new Error(`Failed to create project: ${(error as Error).message}`);
    }
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): Project | null {
    return this.projects.get(projectId) || null;
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<Project[]> {
    // Scan projects directory
    try {
      const entries = await fs.readdir(this.projectsDir, { withFileTypes: true });
      const projects: Project[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectId = entry.name;
          const projectPath = join(this.projectsDir, projectId);

          // Check if already in memory
          if (this.projects.has(projectId)) {
            projects.push(this.projects.get(projectId)!);
          } else {
            // Load from disk
            const stat = await fs.stat(projectPath);
            const project: Project = {
              id: projectId,
              name: projectId,
              path: projectPath,
              createdAt: stat.birthtimeMs,
              lastModified: stat.mtimeMs,
              isRunning: false,
            };
            this.projects.set(projectId, project);
            projects.push(project);
          }
        }
      }

      return projects;
    } catch (error) {
      console.error('[LocalSandbox] Failed to list projects:', error);
      return [];
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(ERROR_MESSAGES.NO_PROJECT);
    }

    console.log(`[LocalSandbox] Deleting project: ${projectId}`);

    try {
      // Remove from disk
      await fs.rm(project.path, { recursive: true, force: true });

      // Remove from memory
      this.projects.delete(projectId);

      // Clear cache
      fileCacheManager.invalidate(projectId);

      console.log(`[LocalSandbox] Project deleted: ${projectId}`);
    } catch (error) {
      console.error(`[LocalSandbox] Failed to delete project:`, error);
      throw error;
    }
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Write file to project
   */
  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(ERROR_MESSAGES.NO_PROJECT);
    }

    // Security check
    if (!this.isAllowedFileType(filePath)) {
      throw new Error(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }

    if (content.length > builderConfig.security.maxFileSize) {
      throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    const fullPath = join(project.path, filePath);

    try {
      // Ensure directory exists
      await fs.mkdir(dirname(fullPath), { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');

      // Update cache
      fileCacheManager.updateFile(projectId, filePath, content);

      // Update project modified time
      project.lastModified = Date.now();

      console.log(`[LocalSandbox] Wrote file: ${filePath} (${content.length} bytes)`);
    } catch (error) {
      console.error(`[LocalSandbox] Failed to write file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read file from project
   */
  async readFile(projectId: string, filePath: string): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(ERROR_MESSAGES.NO_PROJECT);
    }

    const fullPath = join(project.path, filePath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`[LocalSandbox] Failed to read file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * List files in project
   */
  async listFiles(projectId: string, directory: string = ''): Promise<string[]> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(ERROR_MESSAGES.NO_PROJECT);
    }

    const basePath = join(project.path, directory);
    const files: string[] = [];

    try {
      await this.scanDirectory(basePath, project.path, files);
      return files;
    } catch (error) {
      console.error(`[LocalSandbox] Failed to list files:`, error);
      return [];
    }
  }

  /**
   * Get all files with content (for cache)
   */
  private async fetchFilesFromDisk(projectId: string): Promise<Record<string, SandboxFile>> {
    const files: Record<string, SandboxFile> = {};
    const filePaths = await this.listFiles(projectId);

    for (const filePath of filePaths) {
      try {
        const content = await this.readFile(projectId, filePath);
        files[filePath] = {
          content,
          lastModified: Date.now(),
          size: content.length,
        };
      } catch (error) {
        console.error(`[LocalSandbox] Failed to read ${filePath}:`, error);
      }
    }

    console.log(`[LocalSandbox] Fetched ${Object.keys(files).length} files from disk`);

    return files;
  }

  // ============================================================================
  // Package Management
  // ============================================================================

  /**
   * Install npm packages
   */
  async installPackages(projectId: string, packages: string[]): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(ERROR_MESSAGES.NO_PROJECT);
    }

    if (packages.length === 0) return;

    console.log(`[LocalSandbox] Installing packages: ${packages.join(', ')}`);

    try {
      const { stdout, stderr } = await execAsync(`npm install ${packages.join(' ')}`, {
        cwd: project.path,
        timeout: 60000, // 60 second timeout
      });

      if (stderr && !stderr.includes('WARN')) {
        console.error(`[LocalSandbox] npm stderr:`, stderr);
      }

      console.log(`[LocalSandbox] Packages installed successfully`);
    } catch (error) {
      console.error(`[LocalSandbox] Failed to install packages:`, error);
      throw new Error(`Package installation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Run arbitrary command in project directory
   */
  async runCommand(projectId: string, command: string): Promise<{ stdout: string; stderr: string }> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(ERROR_MESSAGES.NO_PROJECT);
    }

    console.log(`[LocalSandbox] Running command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: project.path,
        timeout: builderConfig.security.sandboxTimeout,
      });

      return { stdout, stderr };
    } catch (error) {
      console.error(`[LocalSandbox] Command failed:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Initialize Vite project with minimal template
   */
  private async initializeViteProject(projectPath: string): Promise<void> {
    // Create basic Vite + React structure
    const structure = {
      'package.json': JSON.stringify({
        name: 'ai-builder-project',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        },
        devDependencies: {
          '@types/react': '^18.3.1',
          '@types/react-dom': '^18.3.1',
          '@vitejs/plugin-react': '^4.3.4',
          autoprefixer: '^10.4.20',
          postcss: '^8.4.49',
          tailwindcss: '^3.4.17',
          typescript: '^5.6.3',
          vite: '^6.0.3',
        },
      }, null, 2),

      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})`,

      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          isolatedModules: true,
          moduleDetection: 'force',
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
          noUncheckedSideEffectImports: true,
        },
        include: ['src'],
      }, null, 2),

      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,

      'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Builder App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

      'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

      'src/App.tsx': `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI Builder App
        </h1>
        <p className="text-gray-600">
          Start building with AI!
        </p>
      </div>
    </div>
  )
}`,

      'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
    };

    // Write all files
    for (const [filePath, content] of Object.entries(structure)) {
      const fullPath = join(projectPath, filePath);
      await fs.mkdir(dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    // Install dependencies
    console.log('[LocalSandbox] Installing dependencies...');
    await execAsync('npm install', {
      cwd: projectPath,
      timeout: 120000, // 2 minute timeout for initial install
    });

    console.log('[LocalSandbox] Vite project initialized');
  }

  /**
   * Recursively scan directory for files
   */
  private async scanDirectory(dirPath: string, basePath: string, files: string[]): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = fullPath.replace(basePath + '/', '');

      // Skip node_modules and hidden files
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, basePath, files);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  /**
   * Check if file type is allowed
   */
  private isAllowedFileType(filePath: string): boolean {
    const allowedExtensions = builderConfig.security.allowedFileTypes;
    return allowedExtensions.some(ext => filePath.endsWith(ext));
  }
}

// Singleton instance
export const localSandbox = new LocalSandbox();
