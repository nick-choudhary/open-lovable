/**
 * Vite Dev Server Manager
 * Manages Vite dev servers for projects with port allocation
 * Provides live preview URLs for each project
 */

import { spawn, ChildProcess } from 'child_process';
import type { ViteProcess } from '../../types';
import { builderConfig, ERROR_MESSAGES, LOGGING } from '../../config/builder.config';
import { localSandbox } from './local-sandbox';

export class ViteManager {
  private processes: Map<string, ViteProcess & { process: ChildProcess }> = new Map();
  private allocatedPorts: Set<number> = new Set();

  /**
   * Start Vite dev server for a project
   */
  async startServer(projectId: string): Promise<ViteProcess> {
    // Check if already running
    if (this.processes.has(projectId)) {
      console.log(`[ViteManager] Server already running for ${projectId}`);
      return this.processes.get(projectId)!;
    }

    const project = localSandbox.getProject(projectId);
    if (!project) {
      throw new Error(ERROR_MESSAGES.NO_PROJECT);
    }

    // Allocate port
    const port = this.allocatePort();

    console.log(`[ViteManager] Starting Vite server on port ${port}...`);

    try {
      // Start Vite process
      const process = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
        cwd: project.path,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: port.toString(),
          FORCE_COLOR: '1',
        },
      });

      const viteProcess: ViteProcess & { process: ChildProcess } = {
        pid: process.pid!,
        port,
        startedAt: Date.now(),
        url: `http://localhost:${port}`,
        process,
      };

      // Handle process output
      process.stdout?.on('data', (data) => {
        const output = data.toString();
        if (LOGGING.verbose) {
          console.log(`[Vite:${projectId}]`, output);
        }

        // Check if server is ready
        if (output.includes('Local:') || output.includes('localhost')) {
          console.log(`[ViteManager] Server ready at ${viteProcess.url}`);
        }
      });

      process.stderr?.on('data', (data) => {
        const error = data.toString();
        // Only log errors, not warnings
        if (!error.includes('WARN')) {
          console.error(`[Vite:${projectId}] ERROR:`, error);
        }
      });

      process.on('close', (code) => {
        console.log(`[ViteManager] Server stopped for ${projectId} (code: ${code})`);
        this.processes.delete(projectId);
        this.allocatedPorts.delete(port);

        // Update project status
        const proj = localSandbox.getProject(projectId);
        if (proj) {
          proj.isRunning = false;
          proj.vitePort = undefined;
        }
      });

      // Store process
      this.processes.set(projectId, viteProcess);

      // Update project status
      project.isRunning = true;
      project.vitePort = port;

      // Wait for server to be ready (max 10 seconds)
      await this.waitForServer(port, 10000);

      console.log(`[ViteManager] Server started successfully for ${projectId}`);

      return viteProcess;
    } catch (error) {
      this.allocatedPorts.delete(port);
      console.error(`[ViteManager] Failed to start server:`, error);
      throw new Error(ERROR_MESSAGES.VITE_START_FAILED);
    }
  }

  /**
   * Stop Vite dev server for a project
   */
  async stopServer(projectId: string): Promise<void> {
    const viteProcess = this.processes.get(projectId);
    if (!viteProcess) {
      console.log(`[ViteManager] No server running for ${projectId}`);
      return;
    }

    console.log(`[ViteManager] Stopping server for ${projectId}...`);

    try {
      viteProcess.process.kill('SIGTERM');

      // Wait for process to exit (max 5 seconds)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if not stopped
          viteProcess.process.kill('SIGKILL');
          resolve();
        }, 5000);

        viteProcess.process.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.processes.delete(projectId);
      this.allocatedPorts.delete(viteProcess.port);

      console.log(`[ViteManager] Server stopped for ${projectId}`);
    } catch (error) {
      console.error(`[ViteManager] Failed to stop server:`, error);
      throw error;
    }
  }

  /**
   * Restart Vite dev server (useful after installing packages)
   */
  async restartServer(projectId: string): Promise<ViteProcess> {
    console.log(`[ViteManager] Restarting server for ${projectId}...`);

    await this.stopServer(projectId);

    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.startServer(projectId);
  }

  /**
   * Get server status for a project
   */
  getServerStatus(projectId: string): ViteProcess | null {
    const process = this.processes.get(projectId);
    if (!process) return null;

    return {
      pid: process.pid,
      port: process.port,
      startedAt: process.startedAt,
      url: process.url,
    };
  }

  /**
   * Get all running servers
   */
  getAllServers(): Map<string, ViteProcess> {
    const servers = new Map<string, ViteProcess>();

    for (const [projectId, process] of this.processes.entries()) {
      servers.set(projectId, {
        pid: process.pid,
        port: process.port,
        startedAt: process.startedAt,
        url: process.url,
      });
    }

    return servers;
  }

  /**
   * Stop all servers (for cleanup)
   */
  async stopAllServers(): Promise<void> {
    console.log(`[ViteManager] Stopping all servers...`);

    const stopPromises = Array.from(this.processes.keys()).map((projectId) =>
      this.stopServer(projectId)
    );

    await Promise.all(stopPromises);

    console.log(`[ViteManager] All servers stopped`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Allocate an available port
   */
  private allocatePort(): number {
    const [minPort, maxPort] = builderConfig.sandbox.portRange;

    for (let port = minPort; port <= maxPort; port++) {
      if (!this.allocatedPorts.has(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new Error('No available ports');
  }

  /**
   * Wait for server to be ready by checking if port is listening
   */
  private async waitForServer(port: number, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Try to fetch from the server
        const response = await fetch(`http://localhost:${port}`, {
          method: 'HEAD',
        }).catch(() => null);

        if (response) {
          console.log(`[ViteManager] Server responding on port ${port}`);
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      // Wait 500ms before next check
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.warn(`[ViteManager] Server on port ${port} did not respond within ${timeout}ms`);
  }
}

// Singleton instance
export const viteManager = new ViteManager();

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('\n[ViteManager] Shutting down...');
  await viteManager.stopAllServers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[ViteManager] Shutting down...');
  await viteManager.stopAllServers();
  process.exit(0);
});
