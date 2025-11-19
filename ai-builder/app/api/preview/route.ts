/**
 * Preview API Route
 * Manages Vite dev servers for live previews
 */

import { NextRequest, NextResponse } from 'next/server';
import { viteManager } from '../../../lib/sandbox/vite-manager';
import type { ApiResponse, ViteProcess } from '../../../types';

// GET /api/preview - Get preview status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const status = viteManager.getServerStatus(projectId);

    const response: ApiResponse<ViteProcess | null> = {
      success: true,
      data: status,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Preview] GET error:', error);

    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/preview - Start preview server
export async function POST(request: NextRequest) {
  try {
    const { projectId, action } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    let result: ViteProcess;

    switch (action) {
      case 'start':
        result = await viteManager.startServer(projectId);
        break;

      case 'stop':
        await viteManager.stopServer(projectId);
        return NextResponse.json({ success: true });

      case 'restart':
        result = await viteManager.restartServer(projectId);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: start, stop, or restart' },
          { status: 400 }
        );
    }

    const response: ApiResponse<ViteProcess> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Preview] POST error:', error);

    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
