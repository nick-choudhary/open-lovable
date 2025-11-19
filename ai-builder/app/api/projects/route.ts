/**
 * Projects API Route
 * Handles project CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { localSandbox } from '../../../lib/sandbox/local-sandbox';
import type { ApiResponse, Project } from '../../../types';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await localSandbox.listProjects();

    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Projects] List error:', error);

    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = await localSandbox.createProject(name);

    const response: ApiResponse<Project> = {
      success: true,
      data: project,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Projects] Create error:', error);

    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/projects - Delete project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    await localSandbox.deleteProject(projectId);

    const response: ApiResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Projects] Delete error:', error);

    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
