/**
 * Chat API Route
 * Main endpoint for AI code generation with full token optimization
 * Implements all caching and context selection strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

import { builderConfig, LOGGING, ERROR_MESSAGES } from '../../../config/builder.config';
import { fileCacheManager } from '../../../lib/cache/file-cache';
import { conversationManager } from '../../../lib/cache/conversation-state';
import { contextSelector } from '../../../lib/selectors/context-selector';
import { promptBuilder } from '../../../lib/prompts/prompt-builder';
import { localSandbox } from '../../../lib/sandbox/local-sandbox';
import type { ChatStreamEvent } from '../../../types';

// Force dynamic for streaming
export const dynamic = 'force-dynamic';

// Initialize AI provider based on configuration
// Supports ANY OpenAI-compatible API (LM Studio, Ollama, Together, Groq, etc.)
function getAIProvider() {
  const provider = builderConfig.ai.provider;
  const apiKey = builderConfig.ai.apiKey;
  const baseURL = builderConfig.ai.baseURL;

  console.log(`[Chat] Using AI provider: ${provider}${baseURL ? ` at ${baseURL}` : ''}`);

  switch (provider) {
    case 'anthropic':
      return createAnthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      });

    case 'google':
      return createGoogleGenerativeAI({
        apiKey: apiKey || process.env.GEMINI_API_KEY,
      });

    case 'openai':
      return createOpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        baseURL: baseURL,
      });

    case 'openai-compatible':
    default:
      // Works with ANY OpenAI-compatible API:
      // - LM Studio: http://localhost:1234/v1
      // - Ollama: http://localhost:11434/v1
      // - Together AI: https://api.together.xyz/v1
      // - Groq: https://api.groq.com/openai/v1
      // - Perplexity: https://api.perplexity.ai
      // - Any other OpenAI-spec endpoint
      return createOpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY || 'local', // 'local' works for local models
        baseURL: baseURL || process.env.OPENAI_BASE_URL,
      });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, projectId } = await request.json();

    if (!prompt || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`\n[Chat] New request for project: ${projectId}`);
    console.log(`[Chat] Prompt: ${prompt.substring(0, 100)}...`);

    // Verify project exists
    const project = localSandbox.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.NO_PROJECT },
        { status: 404 }
      );
    }

    // Create stream for progress updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendProgress = async (event: ChatStreamEvent) => {
      const message = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(message));
    };

    // Process in background
    (async () => {
      try {
        await sendProgress({ type: 'status', message: '🔍 Analyzing request...' });

        // Step 1: Get files from cache (or disk if cache miss)
        const files = await fileCacheManager.getFiles(projectId);
        const fileCount = Object.keys(files).length;
        const isNewProject = fileCount === 0;

        console.log(`[Chat] Files: ${fileCount} (${isNewProject ? 'NEW' : 'EXISTING'} project)`);

        // Step 2: Get or parse manifest
        const manifest = await fileCacheManager.getManifest(projectId);

        if (LOGGING.logCacheMetrics) {
          const cacheStats = fileCacheManager.getStats(projectId);
          console.log(`[Chat] Cache stats:`, cacheStats);
        }

        // Step 3: Select optimal context based on intent
        await sendProgress({ type: 'status', message: '🎯 Selecting context...' });

        const context = contextSelector.selectContext(prompt, files, manifest);

        console.log(
          `[Chat] Context selected - Primary: ${Object.keys(context.primaryFiles).length}, ` +
          `Context: ${Object.keys(context.contextFiles).length}, ` +
          `Est. tokens: ${context.estimatedTokens}`
        );

        // Step 4: Build conversation context
        const conversationContext = conversationManager.buildContext(projectId);

        // Step 5: Build optimized prompts (cacheable system + dynamic user)
        await sendProgress({ type: 'status', message: '📝 Building prompt...' });

        const { systemPrompt, userPrompt, estimatedTokens } = promptBuilder.buildPrompt(
          prompt,
          context,
          conversationContext,
          isNewProject
        );

        console.log(`[Chat] Estimated tokens: ${estimatedTokens}`);

        // Step 6: Add user message to conversation
        conversationManager.addUserMessage(projectId, prompt);

        // Step 7: Stream from AI with caching
        await sendProgress({ type: 'status', message: '🤖 Generating code...' });

        // Get AI provider (supports any OpenAI-compatible API)
        const aiProvider = getAIProvider();
        const model = builderConfig.ai.model;
        const provider = builderConfig.ai.provider;

        // Create model instance
        const modelInstance = aiProvider(model);

        const streamOptions: any = {
          model: modelInstance,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          maxTokens: builderConfig.ai.maxTokens,
          temperature: builderConfig.ai.temperature,
        };

        // Enable Anthropic prompt caching
        if (provider === 'anthropic' && builderConfig.ai.enableCaching) {
          streamOptions.experimental_providerMetadata = {
            anthropic: {
              cacheControl: { type: 'ephemeral' },
            },
          };
        }

        const result = await streamText(streamOptions);

        // Step 8: Stream response and collect generated code
        let generatedCode = '';
        let tokenCount = 0;

        for await (const textPart of result.textStream) {
          generatedCode += textPart;
          tokenCount += Math.ceil(textPart.length / 4); // Rough estimate

          // Stream to client
          await sendProgress({
            type: 'stream',
            text: textPart,
          });
        }

        console.log(`[Chat] Generation complete - ${generatedCode.length} chars, ~${tokenCount} tokens`);

        // Step 9: Parse generated files
        const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
        const parsedFiles: Array<{ path: string; content: string }> = [];
        let match;

        while ((match = fileRegex.exec(generatedCode)) !== null) {
          parsedFiles.push({
            path: match[1],
            content: match[2].trim(),
          });
        }

        console.log(`[Chat] Parsed ${parsedFiles.length} files`);

        // Step 10: Write files to sandbox
        await sendProgress({ type: 'status', message: '💾 Writing files...' });

        for (const file of parsedFiles) {
          await localSandbox.writeFile(projectId, file.path, file.content);
          await sendProgress({
            type: 'file',
            message: `Wrote ${file.path}`,
          });
        }

        // Step 11: Detect and install packages
        const packages = extractPackages(generatedCode);

        if (packages.length > 0) {
          await sendProgress({ type: 'status', message: '📦 Installing packages...' });

          for (const pkg of packages) {
            await sendProgress({ type: 'package', packageName: pkg });
          }

          await localSandbox.installPackages(projectId, packages);
        }

        // Step 12: Update conversation state
        conversationManager.addAssistantMessage(projectId, generatedCode, {
          tokenCount,
          filesEdited: parsedFiles.map((f) => f.path),
        });

        conversationManager.recordEdit(
          projectId,
          prompt,
          context.editIntent.type,
          parsedFiles.map((f) => f.path),
          context.editIntent.confidence,
          'success'
        );

        conversationManager.updateTokenUsage(projectId, estimatedTokens);

        // Step 13: Send completion
        await sendProgress({
          type: 'complete',
          message: `Generated ${parsedFiles.length} files`,
          files: parsedFiles.length,
          tokenEstimate: estimatedTokens,
        });

        console.log(`[Chat] Request completed successfully\n`);
      } catch (error) {
        console.error('[Chat] Error:', error);

        await sendProgress({
          type: 'error',
          error: (error as Error).message,
        });

        // Record error in conversation
        conversationManager.recordEdit(
          projectId,
          prompt,
          'UPDATE_COMPONENT',
          [],
          0,
          'error',
          (error as Error).message
        );
      } finally {
        await writer.close();
      }
    })();

    // Return stream
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat] Request error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract package names from import statements
 */
function extractPackages(code: string): string[] {
  const packages: string[] = [];
  const regex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = regex.exec(code)) !== null) {
    const importPath = match[1];

    // Skip relative imports and built-ins
    if (
      importPath.startsWith('.') ||
      importPath.startsWith('/') ||
      importPath === 'react' ||
      importPath === 'react-dom'
    ) {
      continue;
    }

    // Extract package name (handle scoped packages)
    const packageName = importPath.startsWith('@')
      ? importPath.split('/').slice(0, 2).join('/')
      : importPath.split('/')[0];

    if (!packages.includes(packageName)) {
      packages.push(packageName);
    }
  }

  return packages;
}
