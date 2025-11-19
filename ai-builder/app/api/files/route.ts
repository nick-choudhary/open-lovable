/**
 * Files API Route
 * Handles file read/write operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { localSandbox } from '../../../lib/sandbox/local-sandbox';
import { fileCacheManager } from '../../../lib/cache/file-cache';
import type { ApiResponse } from '../../../types';

// GET /api/files - List files or read file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const filePath = searchParams.get('path');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (filePath) {
      // Read specific file
      const content = await localSandbox.readFile(projectId, filePath);

      const response: ApiResponse<{ path: string; content: string }> = {
        success: true,
        data: { path: filePath, content },
      };

      return NextResponse.json(response);
    } else {
      // List all files
      const files = await localSandbox.listFiles(projectId);

      const response: ApiResponse<string[]> = {
        success: true,
        data: files,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('[Files] GET error:', error);

    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/files - Write file
export async function POST(request: NextRequest) {
  try {
    const { projectId, path, content } = await request.json();

    if (!projectId || !path || content === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await localSandbox.writeFile(projectId, path, content);

    // Invalidate cache since files changed
    fileCacheManager.invalidate(projectId);

    const response: ApiResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Files] POST error:', error);

    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
